import { useState, useMemo, useRef, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useBrandSettings } from "@/lib/brand";
import { useMasterPanelDesigns } from "@/lib/design-presets";
import { printInvoicePdf, printThermalSlip, printShippingSticker } from "@/lib/invoice-pdf";
import { renderInvoiceHtml, sampleInvoicePayload } from "@/lib/invoice-render";
import { renderPosSlipHtml } from "@/lib/pos-slip-render";
import { renderOrderStickerHtml } from "@/lib/order-sticker-render";
import { Sticker } from "@/components/StickerPreview";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { lookupSerial } from "@/lib/serials";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Badge } from "@ui/components/ui/badge";
import { Label } from "@ui/components/ui/label";
import { toast } from "sonner";
import {
  Layers,
  Search,
  PackageCheck,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  RotateCcw,
  Barcode,
  Package,
  Boxes,
  ArrowUpDown,
  Tag,
  AlertCircle,
  Printer,
  Download,
  Copy,
  Sparkles,
  Sliders,
  ExternalLink,
  Plus,
  Edit,
  ScanLine,
  X,
  Camera,
  CheckSquare,
  Square,
  Save,
  Trash2,
  ArrowRight,
  Receipt,
  FileText,
  Lock,
  Eye,
  ZoomIn,
  ZoomOut,
  ShoppingBag,
  Store,
  Truck,
  Check,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import { extractSerialCode } from "@orizino/shared";

const sb = supabase as any;

type TabMode = "products" | "serials" | "invoices_stickers";
type StickerLayout = "thermal_50x30" | "thermal_50x50" | "retail_tag" | "a4_sheet";

interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  compare_at_price?: number | null;
  stock_quantity: number;
  is_active: boolean;
  thumbnail?: string | null;
  images?: string[] | string | null;
  product_variants?: { id: string; size?: string | null; color?: string | null; sku?: string; stock_quantity?: number; price_override?: number }[];
}

interface SerialItem {
  id: string;
  serial_code: string;
  status: string;
  is_defective?: boolean;
  created_at: string;
  sold_at?: string;
  sold_order_id?: string;
  product_id: string;
  variant_id?: string | null;
  products?: { id: string; name: string; sku: string; price: number };
  product_variants?: { id: string; size?: string | null; color?: string | null; sku?: string };
}

interface MiniScannedItem {
  serialId: string;
  serialCode: string;
  productName: string;
  variantText?: string;
  currentStatus: string;
  targetStatus: string;
  isDefective: boolean;
}

function getProductThumbnailUrl(p: ProductItem): string | null {
  if (p.thumbnail && typeof p.thumbnail === "string" && p.thumbnail.trim()) {
    return p.thumbnail.trim();
  }
  if (Array.isArray(p.images) && p.images.length > 0 && typeof p.images[0] === "string" && p.images[0].trim()) {
    return p.images[0].trim();
  }
  if (typeof p.images === "string" && p.images.trim()) {
    try {
      const parsed = JSON.parse(p.images);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") return parsed[0];
    } catch {
      if (p.images.startsWith("http") || p.images.startsWith("/")) return p.images;
    }
  }
  return null;
}

// ── SUB-COMPONENT: EXPANDED PRODUCT SERIALS ACCORDION ──
function ProductSerialsDetailPanel({
  product,
  onEditSerial,
  onPreviewTag,
}: {
  product: ProductItem;
  onEditSerial: (serial: SerialItem) => void;
  onPreviewTag: (product: ProductItem) => void;
}) {
  const [filter, setFilter] = useState<"all" | "available" | "sold" | "defective">("all");
  const [serialSearch, setSerialSearch] = useState("");

  const { data: productSerials = [], isLoading, refetch } = useQuery<SerialItem[]>({
    queryKey: ["orderops-product-serials", product.id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("product_serials")
        .select(`
          id, serial_code, status, created_at, sold_at, sold_order_id, product_id, variant_id,
          product_variants ( id, size, color, sku )
        `)
        .eq("product_id", product.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load product serials:", error);
        return [];
      }
      return (data || []).map((row: any) => ({
        ...row,
        products: { id: product.id, name: product.name, sku: product.sku || "", price: product.price },
      }));
    },
    staleTime: 10_000,
  });

  const counts = useMemo(() => {
    let available = 0;
    let sold = 0;
    let defective = 0;
    productSerials.forEach((s) => {
      if (s.is_defective || s.status === "defective") defective++;
      else if (s.status === "available") available++;
      else if (s.status === "sold") sold++;
      else if (s.status === "returned") defective++;
    });
    return { total: productSerials.length, available, sold, defective };
  }, [productSerials]);

  const filtered = useMemo(() => {
    return productSerials.filter((s) => {
      const q = serialSearch.trim().toLowerCase();
      if (q && !s.serial_code.toLowerCase().includes(q)) return false;
      const isDef = s.is_defective || s.status === "defective" || s.status === "returned";
      if (filter === "available" && s.status !== "available") return false;
      if (filter === "sold" && s.status !== "sold") return false;
      if (filter === "defective" && !isDef) return false;
      return true;
    });
  }, [productSerials, filter, serialSearch]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${text} to clipboard`);
  };

  return (
    <div className="space-y-3 p-3 sm:p-4 rounded-2xl bg-card border border-primary/20 shadow-xs animate-in fade-in duration-150">
      {/* Sub-header with Counters & Quick Actions */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Barcode className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-none">Serials: {product.name}</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onPreviewTag(product)}
            className="h-7 px-2.5 text-[11px] font-bold gap-1 rounded-lg bg-background hover:bg-muted cursor-pointer shrink-0 ml-auto"
          >
            <QrCode className="w-3 h-3 text-primary" />
            <span>Tag Preview</span>
          </Button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground font-bold border border-border/60">
            Total: {counts.total}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
            Stock: {counts.available}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-bold border border-blue-500/20">
            Sold: {counts.sold}
          </span>
          {counts.defective > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20">
              Defective: {counts.defective}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
              placeholder="Search serial code…"
              className="h-7.5 pl-8 pr-2.5 text-xs w-full rounded-lg bg-background"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/60 overflow-x-auto shrink-0">
            {[
              { id: "all", label: "All" },
              { id: "available", label: "Stock" },
              { id: "sold", label: "Sold" },
              { id: "defective", label: "Defective" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id as any)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  filter === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Serials List */}
      {isLoading && (
        <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading serials…</span>
        </div>
      )}

      {!isLoading && productSerials.length === 0 && (
        <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
          <Barcode className="w-6 h-6 mx-auto opacity-30 mb-1" />
          <p className="font-semibold text-foreground">No serial numbers generated yet for this piece</p>
          <p className="text-[11px]">Serials can be generated or assigned in MasterPanel Inventory Studio.</p>
        </div>
      )}

      {!isLoading && productSerials.length > 0 && filtered.length === 0 && (
        <div className="py-4 text-center text-xs text-muted-foreground">
          No serials matching filter "{filter}".
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filtered.map((s) => {
            const isDef = s.is_defective || s.status === "defective";
            const varText = [s.product_variants?.size, s.product_variants?.color].filter(Boolean).join(" / ");

            return (
              <div
                key={s.id}
                className="p-3 rounded-xl border border-border/70 bg-background/80 hover:border-primary/40 transition-colors flex flex-col justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-foreground text-[11px] truncate">{s.serial_code}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(s.serial_code)}
                      title="Copy serial code"
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">
                      {varText ? `Var: ${varText}` : "Standard Unit"}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] border ${
                        isDef
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          : s.status === "available"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : s.status === "sold"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      }`}
                    >
                      {isDef ? "defective" : s.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span>{format(new Date(s.created_at), "dd MMM yyyy")}</span>
                  <button
                    type="button"
                    onClick={() => onEditSerial(s)}
                    className="font-bold text-primary hover:underline cursor-pointer inline-flex items-center gap-0.5"
                  >
                    <Edit className="w-2.5 h-2.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function InventoryStudio() {
  const brand = useBrandSettings();
  const { brand: mpBrand, invoiceSettings, posSettings, shippingStickerPreset, productStickerPreset, refetchAll } = useMasterPanelDesigns();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabMode>("products");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [serialStatusFilter, setSerialStatusFilter] = useState<string>("all");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Manual Status Edit Modal
  const [editingSerial, setEditingSerial] = useState<SerialItem | null>(null);
  const [editStatusValue, setEditStatusValue] = useState<string>("available");
  const [editIsDefective, setEditIsDefective] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Mini Scanner in Stocks Page
  const [isMiniScannerOpen, setIsMiniScannerOpen] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [miniScannedList, setMiniScannedList] = useState<MiniScannedItem[]>([]);
  const [selectedScanIds, setSelectedScanIds] = useState<Set<string>>(new Set());
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>("available");
  const [bulkIsDefective, setBulkIsDefective] = useState<boolean>(false);
  const [singleActiveScan, setSingleActiveScan] = useState<MiniScannedItem | null>(null);
  const [isSavingMiniBatch, setIsSavingMiniBatch] = useState(false);

  // Sticker Live Preview State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [customSerialText, setCustomSerialText] = useState<string>("");
  const [stickerLayout, setStickerLayout] = useState<StickerLayout>("thermal_50x30");
  const stickerPreviewRef = useRef<HTMLDivElement>(null);
  const orderStickerRef = useRef<HTMLDivElement>(null);
  const productStickerRef = useRef<HTMLDivElement>(null);

  // Live Preview Zoom Controls - Responsive Auto-Fitting for Mobile & Desktop
  const [invoiceZoom, setInvoiceZoom] = useState<number>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      const availWidth = Math.max(280, window.innerWidth - 32);
      return Math.max(30, Math.min(48, Math.floor((availWidth / 794) * 100)));
    }
    return 100;
  });
  const [posZoom, setPosZoom] = useState<number>(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 90 : 100));
  const [orderStickerZoom, setOrderStickerZoom] = useState<number>(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 80 : 125));
  const [productStickerZoom, setProductStickerZoom] = useState<number>(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 150 : 200));

  // Fetch product inventory with thumbnail and images
  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useQuery<ProductItem[]>({
    queryKey: ["orderops-stock-products"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("products")
        .select(`
          id, name, sku, price, compare_at_price, stock_quantity, is_active, thumbnail, images,
          product_variants ( id, size, color, sku, stock_quantity, price_override )
        `)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading products:", error);
        toast.error("Failed to load products");
        return [];
      }
      return data || [];
    },
  });

  // Fetch serial numbers ledger
  const { data: serials = [], isLoading: loadingSerials, refetch: refetchSerials } = useQuery<SerialItem[]>({
    queryKey: ["orderops-stock-serials", serialStatusFilter],
    queryFn: async () => {
      let query = sb
        .from("product_serials")
        .select(`
          id, serial_code, status, created_at, sold_at, sold_order_id, product_id, variant_id,
          products ( id, name, sku, price ),
          product_variants ( id, size, color, sku )
        `)
        .order("created_at", { ascending: false })
        .limit(300);

      if (serialStatusFilter !== "all") {
        query = query.eq("status", serialStatusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error loading serials:", error);
        toast.error("Failed to load serials ledger");
        return [];
      }
      return data || [];
    },
  });

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const name = (p.name || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        const varSkus = (p.product_variants || []).map((v) => (v.sku || "").toLowerCase()).join(" ");
        if (!name.includes(q) && !sku.includes(q) && !varSkus.includes(q)) return false;
      }
      const qty = p.stock_quantity ?? 0;
      if (productFilter === "in_stock" && qty <= 0) return false;
      if (productFilter === "low_stock" && (qty <= 0 || qty > 5)) return false;
      if (productFilter === "out_of_stock" && qty > 0) return false;
      return true;
    });
  }, [products, search, productFilter]);

  // Filtered Serials
  const filteredSerials = useMemo(() => {
    return serials.filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const code = (s.serial_code || "").toLowerCase();
      const name = (s.products?.name || "").toLowerCase();
      const sku = (s.products?.sku || "").toLowerCase();
      return code.includes(q) || name.includes(q) || sku.includes(q);
    });
  }, [serials, search]);

  // Toggle product accordion expansion
  const toggleProductExpand = (id: string) => {
    setExpandedProductId((prev) => (prev === id ? null : id));
  };

  // Handle Mini Scanner Code Detection
  const handleMiniScan = async (rawInput: string) => {
    const code = extractSerialCode(rawInput) || rawInput.trim();
    if (!code) return;

    if (miniScannedList.some((s) => s.serialCode.toLowerCase() === code.toLowerCase())) {
      toast.warning(`Serial ${code} already scanned.`);
      return;
    }

    try {
      const row = await lookupSerial(code);
      if (!row) {
        toast.error(`Serial "${code}" not found in inventory.`);
        return;
      }

      const varText = [row.product_variants?.size, row.product_variants?.color].filter(Boolean).join(" / ");
      const newItem: MiniScannedItem = {
        serialId: row.id,
        serialCode: row.serial_code,
        productName: row.products?.name || "Product",
        variantText: varText || undefined,
        currentStatus: row.status,
        targetStatus: row.status,
        isDefective: (row as any).is_defective || false,
      };

      if (isContinuousMode) {
        setMiniScannedList((prev) => [newItem, ...prev]);
        setSelectedScanIds((prev) => new Set([...prev, newItem.serialId]));
        toast.success(`✓ Scanned: ${newItem.productName} (${newItem.serialCode})`);
      } else {
        setSingleActiveScan(newItem);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to scan serial");
    }
  };

  // Save Single Scanned Serial Status
  const handleSaveSingleScanStatus = async () => {
    if (!singleActiveScan) return;
    try {
      let finalStatus = singleActiveScan.targetStatus;
      if (finalStatus === "returned" && !singleActiveScan.isDefective) {
        finalStatus = "available";
      }

      await sb
        .from("product_serials")
        .update({
          status: finalStatus,
          sold_order_id: finalStatus === "available" || finalStatus === "cancelled" ? null : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", singleActiveScan.serialId);

      await sb.rpc("sync_stock_from_serials");
      await qc.invalidateQueries({ queryKey: ["orderops-stock-serials"] });
      await qc.invalidateQueries({ queryKey: ["orderops-stock-products"] });
      await qc.invalidateQueries({ queryKey: ["orderops-product-serials"] });

      toast.success(`✓ Serial ${singleActiveScan.serialCode} updated to ${finalStatus}!`);
      setSingleActiveScan(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update serial");
    }
  };

  // Save Batch Scanned Serials Status
  const handleSaveBatchStatuses = async () => {
    if (miniScannedList.length === 0) return;
    setIsSavingMiniBatch(true);
    try {
      const updates = miniScannedList.map((item) => {
        let finalStatus = item.targetStatus;
        if (finalStatus === "returned" && !item.isDefective) {
          finalStatus = "available";
        }
        return {
          id: item.serialId,
          status: finalStatus,
          sold_order_id: finalStatus === "available" || finalStatus === "cancelled" ? null : undefined,
          updated_at: new Date().toISOString(),
        };
      });

      for (const u of updates) {
        await sb.from("product_serials").update(u).eq("id", u.id);
      }

      await sb.rpc("sync_stock_from_serials");
      await qc.invalidateQueries({ queryKey: ["orderops-stock-serials"] });
      await qc.invalidateQueries({ queryKey: ["orderops-stock-products"] });
      await qc.invalidateQueries({ queryKey: ["orderops-product-serials"] });

      toast.success(`✓ Successfully updated ${updates.length} serials!`);
      setMiniScannedList([]);
      setSelectedScanIds(new Set());
      setIsMiniScannerOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save batch updates");
    } finally {
      setIsSavingMiniBatch(false);
    }
  };

  // Bulk Apply Target Status in Batch Mode
  const applyBulkStatusToSelected = () => {
    if (selectedScanIds.size === 0) {
      toast.info("Please select at least one scanned item.");
      return;
    }

    setMiniScannedList((prev) =>
      prev.map((it) => {
        if (selectedScanIds.has(it.serialId)) {
          return {
            ...it,
            targetStatus: bulkTargetStatus,
            isDefective: bulkIsDefective,
          };
        }
        return it;
      })
    );
    toast.success(`Applied ${bulkTargetStatus} to ${selectedScanIds.size} selected items.`);
  };

  // Save Manual Status Modal
  const handleSaveManualStatus = async () => {
    if (!editingSerial) return;
    setIsUpdatingStatus(true);
    try {
      let finalStatus = editStatusValue;
      if (finalStatus === "returned" && !editIsDefective) {
        finalStatus = "available";
      }

      await sb
        .from("product_serials")
        .update({
          status: finalStatus,
          sold_order_id: finalStatus === "available" || finalStatus === "cancelled" ? null : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingSerial.id);

      await sb.from("product_serial_events").insert({
        serial_id: editingSerial.id,
        action: "stocks_manual_status_edit",
        to_status: finalStatus,
        metadata: { is_defective: editIsDefective },
      });

      await sb.rpc("sync_stock_from_serials");
      await qc.invalidateQueries({ queryKey: ["orderops-stock-serials"] });
      await qc.invalidateQueries({ queryKey: ["orderops-stock-products"] });
      await qc.invalidateQueries({ queryKey: ["orderops-product-serials"] });

      toast.success(`✓ Serial ${editingSerial.serial_code} updated to ${finalStatus}!`);
      setEditingSerial(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update serial");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const { data: dbBrandSettings } = useQuery({
    queryKey: ["orderops-site-brand-settings"],
    queryFn: async () => {
      const { data } = await sb
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "logo_url", "contact_email", "contact_phone", "address", "website", "brand_settings"]);
      const map: Record<string, string> = {};
      data?.forEach((row: any) => {
        const val = typeof row.value === "object" && row.value !== null ? (row.value.value ?? row.value) : row.value;
        if (typeof val === "string") {
          map[row.key] = val;
        } else if (typeof val === "object" && val !== null) {
          Object.assign(map, val);
        }
      });
      return map;
    },
    staleTime: 60000,
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const activePayload = useMemo(() => {
    return sampleInvoicePayload({
      name: dbBrandSettings?.site_name || "ORIZINO",
      logo_url: dbBrandSettings?.logo_url || "/orizino-logo.svg",
      brand_mark_url: dbBrandSettings?.logo_url || "/orizino-logo.svg",
      address: dbBrandSettings?.address || "Flagship Atelier & Head Office, Dhaka",
      phone: dbBrandSettings?.contact_phone || "+880 1800-000000",
      email: dbBrandSettings?.contact_email || "concierge@orizino.com",
      website: dbBrandSettings?.website || "www.orizino.com",
    });
  }, [dbBrandSettings]);

  const renderedInvoiceHtml = useMemo(() => {
    return renderInvoiceHtml(invoiceSettings as any, activePayload);
  }, [invoiceSettings, activePayload]);

  const renderedPosSlipHtml = useMemo(() => {
    return renderPosSlipHtml(invoiceSettings as any, activePayload, (posSettings?.printer_width === "58mm" ? "58mm" : "80mm") as any);
  }, [invoiceSettings, activePayload, posSettings]);

  const renderedOrderStickerHtml = useMemo(() => {
    return renderOrderStickerHtml(invoiceSettings as any, activePayload, "4x2");
  }, [invoiceSettings, activePayload]);

  const handleTestPrintInvoice = () => {
    const win = window.open("", "_blank", "width=900,height=900");
    if (!win) {
      toast.error("Popup blocked. Please allow popups to print.");
      return;
    }
    win.document.write(renderedInvoiceHtml);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  };

  const handleTestPrintPos = () => {
    const win = window.open("", "_blank", "width=450,height=700");
    if (!win) {
      toast.error("Popup blocked. Please allow popups to print.");
      return;
    }
    win.document.write(renderedPosSlipHtml);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  };

  const handleTestPrintOrderSticker = () => {
    const win = window.open("", "_blank", "width=600,height=400");
    if (!win) {
      toast.error("Popup blocked. Please allow popups to print.");
      return;
    }
    win.document.write(renderedOrderStickerHtml);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  };

  return (
    <div className="space-y-4 pt-1 pb-16">
      {/* Header */}
      <div className="space-y-2 sm:space-y-0">
        {/* Mobile Header Layout */}
        <div className="flex sm:hidden flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight text-foreground font-display truncate">
                  Stock &amp; Serials Hub
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  setIsMiniScannerOpen(true);
                  setMiniScannedList([]);
                  setSelectedScanIds(new Set());
                  setSingleActiveScan(null);
                }}
                className="rounded-xl h-8 px-2.5 text-xs gap-1 bg-primary text-primary-foreground font-bold shadow-xs cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Scan</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchProducts();
                  refetchSerials();
                  refetchAll();
                  toast.info("Refreshed inventory and designs");
                }}
                className="rounded-xl h-8 w-8 p-0 bg-card hover:bg-muted cursor-pointer shrink-0"
                title="Refresh"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground pl-1">
            Warehouse inventory ledger, live serials &amp; quick scanner
          </p>
        </div>

        {/* Desktop Header Layout */}
        <div className="hidden sm:flex sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 font-display">
              <Layers className="w-6 h-6 text-primary" />
              <span>Stock &amp; QR Serials Hub</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Warehouse inventory ledger, live serials manager &amp; quick status scanner
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => {
                setIsMiniScannerOpen(true);
                setMiniScannedList([]);
                setSelectedScanIds(new Set());
                setSingleActiveScan(null);
              }}
              className="rounded-xl h-9 px-3.5 text-xs gap-1.5 bg-primary text-primary-foreground font-bold shadow-xs cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan to Update Status</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchProducts();
                refetchSerials();
                refetchAll();
                toast.info("Refreshed inventory and design templates");
              }}
              className="rounded-xl h-9 px-3 text-xs gap-1.5 bg-card hover:bg-muted cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs — Centered */}
      <div className="flex justify-center w-full overflow-x-auto">
        <div className="bg-secondary/40 dark:bg-card border border-border/70 p-1 rounded-2xl inline-flex items-center gap-1 shadow-2xs max-w-full">
          {[
            { id: "products", label: "Inventory Stock", icon: Package },
            { id: "serials", label: "Serials Ledger", icon: Barcode },
            { id: "invoices_stickers", label: "Invoice & Sticker", icon: Receipt },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as any)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs scale-[1.01]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: INVENTORY STOCK (FULL COMPREHENSIVE LIST VIEW WITH CLICKABLE SERIALS) */}
      {tab === "products" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Filter and Search Bar - Strictly Single Row */}
          <div className="flex flex-row gap-2 items-center justify-between">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by title, SKU, variant…"
                className="h-10 rounded-xl pl-10 text-xs bg-card border-border/70 w-full"
              />
            </div>

            <div className="shrink-0">
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value as any)}
                className="h-10 px-3 rounded-xl bg-card border border-border/70 text-xs font-semibold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              >
                <option value="all">All Items</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock (≤5)</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Products Mobile List View (Compact Cards) */}
          <div className="block sm:hidden space-y-2.5">
            {loadingProducts && (
              <div className="py-10 text-center text-muted-foreground bg-card rounded-2xl border border-border/70">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs">Loading inventory stock…</span>
              </div>
            )}
            {!loadingProducts && filteredProducts.length === 0 && (
              <div className="py-10 text-center text-muted-foreground bg-card rounded-2xl border border-border/70 space-y-1">
                <Package className="w-8 h-8 mx-auto opacity-30 mb-1" />
                <p className="text-xs font-semibold text-foreground">No products found</p>
              </div>
            )}
            {filteredProducts.map((p) => {
              const qty = p.stock_quantity ?? 0;
              const isLow = qty > 0 && qty <= 5;
              const isOut = qty <= 0;
              const variants = p.product_variants || [];
              const isExpanded = expandedProductId === p.id;
              const imgUrl = getProductThumbnailUrl(p);

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border bg-card p-3 space-y-2.5 transition-all shadow-xs ${
                    isExpanded ? "border-primary/50 ring-1 ring-primary/20" : "border-border/70"
                  }`}
                >
                  {/* Top: Thumbnail, Title, Price */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-11 h-11 rounded-xl bg-secondary/80 border border-border/70 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).style.display = "none";
                          }}
                        />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-muted-foreground/60" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-xs line-clamp-2 leading-tight">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 font-mono">
                        <span>{p.sku || "NO-SKU"}</span>
                        <span>•</span>
                        <span className={p.is_active ? "text-emerald-500 font-semibold" : "text-zinc-500 font-semibold"}>
                          {p.is_active ? "Active" : "Archived"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground text-xs font-mono">৳{Number(p.price || 0).toLocaleString()}</p>
                      {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
                        <p className="text-[10px] text-muted-foreground line-through font-mono">৳{Number(p.compare_at_price).toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Stock Status and Variants */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-border/40">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[9px] uppercase border ${
                        isOut
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          : isLow
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOut ? "bg-rose-500" : isLow ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                      {qty} units {isOut ? "(Out)" : isLow ? "(Low)" : ""}
                    </span>

                    {variants.length > 0 && (
                      <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] py-0.5">
                        {variants.map((v) => (
                          <span
                            key={v.id}
                            className="px-1.5 py-0.5 rounded bg-secondary text-foreground/80 border border-border/60 text-[9px] font-medium whitespace-nowrap"
                          >
                            {[v.size, v.color].filter(Boolean).join("/")}: <strong className="font-mono">{v.stock_quantity ?? 0}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      variant={isExpanded ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleProductExpand(p.id)}
                      className="flex-1 h-8 text-[11px] font-bold gap-1.5 rounded-xl cursor-pointer"
                    >
                      <Barcode className="w-3.5 h-3.5" />
                      <span>{isExpanded ? "Hide Serials" : "View Serials"}</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setTab("invoices_stickers");
                      }}
                      className="h-8 px-3 text-[11px] font-bold gap-1 rounded-xl bg-card hover:bg-muted cursor-pointer shrink-0"
                    >
                      <QrCode className="w-3.5 h-3.5 text-primary" />
                      <span>Tag</span>
                    </Button>
                  </div>

                  {/* Expanded Serials on Mobile */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-border/60">
                      <ProductSerialsDetailPanel
                        product={p}
                        onEditSerial={(s) => {
                          setEditingSerial(s);
                          setEditStatusValue(s.status === "defective" ? "returned" : s.status);
                          setEditIsDefective(!!(s.is_defective || s.status === "defective"));
                        }}
                        onPreviewTag={(prod) => {
                          setSelectedProductId(prod.id);
                          setTab("invoices_stickers");
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Products List Desktop/Tablet Table */}
          <div className="hidden sm:block rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">SKU / Code</th>
                    <th className="p-3.5">Price</th>
                    <th className="p-3.5">Stock Status</th>
                    <th className="p-3.5">Variants Breakdown</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loadingProducts && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading inventory stock…
                      </td>
                    </tr>
                  )}
                  {!loadingProducts && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <Package className="w-8 h-8 mx-auto opacity-30 mb-2" />
                        No products found matching the criteria.
                      </td>
                    </tr>
                  )}
                  {filteredProducts.map((p) => {
                    const qty = p.stock_quantity ?? 0;
                    const isLow = qty > 0 && qty <= 5;
                    const isOut = qty <= 0;
                    const variants = p.product_variants || [];
                    const isExpanded = expandedProductId === p.id;
                    const imgUrl = getProductThumbnailUrl(p);

                    return (
                      <Fragment key={p.id}>
                        <tr
                          onClick={() => toggleProductExpand(p.id)}
                          className={`hover:bg-muted/30 transition-colors cursor-pointer select-none ${
                            isExpanded ? "bg-primary/5 border-l-2 border-l-primary" : ""
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              {/* Chevron indicator */}
                              <div className="text-muted-foreground hover:text-primary transition-transform">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-primary" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </div>

                              {/* Product Thumbnail */}
                              <div className="w-10 h-10 rounded-xl bg-secondary/80 border border-border/70 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs">
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback on load error
                                      (e.target as any).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <ShoppingBag className="w-4 h-4 text-muted-foreground/60" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="font-bold text-foreground text-xs truncate max-w-[220px] sm:max-w-xs hover:text-primary transition-colors">
                                  {p.name}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <span className={p.is_active ? "text-emerald-500 font-semibold" : "text-zinc-500 font-semibold"}>
                                    ● {p.is_active ? "Active" : "Archived"}
                                  </span>
                                  {variants.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{variants.length} variant{variants.length > 1 ? "s" : ""}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span className="text-primary font-medium">Click to {isExpanded ? "hide" : "view"} serials</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 font-mono font-semibold text-muted-foreground">
                            {p.sku || "—"}
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-foreground font-mono">
                              ৳{Number(p.price || 0).toLocaleString()}
                            </div>
                            {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
                              <div className="text-[10px] text-muted-foreground line-through font-mono">
                                ৳{Number(p.compare_at_price).toLocaleString()}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase border ${
                                isOut
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                  : isLow
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isOut ? "bg-rose-500" : isLow ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                              {qty} units {isOut ? "(Out of Stock)" : isLow ? "(Low Stock)" : ""}
                            </span>
                          </td>

                          <td className="p-3.5">
                            {variants.length === 0 ? (
                              <span className="text-[11px] text-muted-foreground italic">No variants (Standard unit)</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-sm">
                                {variants.slice(0, 4).map((v) => (
                                  <span
                                    key={v.id}
                                    className="px-2 py-0.5 rounded-md bg-secondary text-foreground/80 border border-border/60 text-[10px] font-medium"
                                  >
                                    {[v.size, v.color].filter(Boolean).join("/") || "Var"} : <strong className="font-mono">{v.stock_quantity ?? 0}</strong>
                                  </span>
                                ))}
                                {variants.length > 4 && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground text-[10px]">
                                    +{variants.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleProductExpand(p.id)}
                                className="rounded-xl h-7.5 px-2.5 text-[11px] font-bold gap-1 bg-card hover:bg-muted cursor-pointer"
                              >
                                <Barcode className="w-3 h-3 text-primary" />
                                <span>{isExpanded ? "Close" : "Serials"}</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedProductId(p.id);
                                  setTab("invoices_stickers");
                                }}
                                className="rounded-xl h-7.5 px-2.5 text-[11px] font-bold gap-1 bg-card hover:bg-muted cursor-pointer"
                              >
                                <QrCode className="w-3 h-3 text-primary" />
                                <span>Tag</span>
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED SERIALS PANEL UNDER THE CLICKED PRODUCT */}
                        {isExpanded && (
                          <tr key={`${p.id}-expanded`} className="bg-muted/10 border-b border-border/60">
                            <td colSpan={6} className="p-3 sm:p-5">
                              <ProductSerialsDetailPanel
                                product={p}
                                onEditSerial={(s) => {
                                  setEditingSerial(s);
                                  setEditStatusValue(s.status === "defective" ? "returned" : s.status);
                                  setEditIsDefective(!!(s.is_defective || s.status === "defective"));
                                }}
                                onPreviewTag={(prod) => {
                                  setSelectedProductId(prod.id);
                                  setTab("invoices_stickers");
                                }}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERIALS LEDGER WITH MANUAL EDIT */}
      {tab === "serials" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search serial code (SN-XXXX), product, or SKU…"
                className="h-10 rounded-xl pl-10 text-xs bg-card border-border/70"
              />
            </div>

            <select
              value={serialStatusFilter}
              onChange={(e) => setSerialStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-card border border-border/80 text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="returned">Returned</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Serials Mobile List View */}
          <div className="block sm:hidden space-y-2">
            {filteredSerials.length === 0 && (
              <div className="py-8 text-center text-muted-foreground bg-card rounded-2xl border border-border/70 text-xs">
                No serial numbers found.
              </div>
            )}
            {filteredSerials.map((s) => {
              const isDefective = s.is_defective || s.status === "defective";
              return (
                <div key={s.id} className="p-3 rounded-2xl border border-border/70 bg-card space-y-2 text-xs shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-foreground text-xs">{s.serial_code}</span>
                      <p className="text-muted-foreground text-[11px] font-medium truncate max-w-[200px]">
                        {s.products?.name || "Product"}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase shrink-0 border ${
                        isDefective
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          : s.status === "available"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : s.status === "sold"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      }`}
                    >
                      {isDefective ? "defective" : s.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
                    <span>{format(new Date(s.created_at), "dd MMM yyyy")}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSerial(s);
                        setEditStatusValue(s.status === "defective" ? "returned" : s.status);
                        setEditIsDefective(!!isDefective);
                      }}
                      className="h-7 px-2.5 text-[11px] font-bold gap-1 rounded-xl bg-background hover:bg-muted cursor-pointer"
                    >
                      <Edit className="w-3 h-3 text-primary" />
                      <span>Edit Status</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Serials Desktop Table */}
          <div className="hidden sm:block rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Serial Code</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSerials.map((s) => {
                    const isDefective = s.is_defective || s.status === "defective";
                    return (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-bold text-foreground">
                          {s.serial_code}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-foreground truncate max-w-[200px]">
                            {s.products?.name || "Product"}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            SKU: {s.products?.sku || "N/A"}
                          </p>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                              isDefective
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                : s.status === "available"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : s.status === "sold"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            }`}
                          >
                            {isDefective ? "returned-defective" : s.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {format(new Date(s.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSerial(s);
                              setEditStatusValue(s.status === "defective" ? "returned" : s.status);
                              setEditIsDefective(!!isDefective);
                            }}
                            className="rounded-xl h-7 px-2.5 text-[11px] font-bold gap-1 bg-card hover:bg-muted cursor-pointer"
                          >
                            <Edit className="w-3 h-3 text-primary" />
                            <span>Edit Status</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVOICE & STICKER (FULL DESIGN PREVIEW SECTIONS LIST) */}
      {tab === "invoices_stickers" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Live Preview Mode Banner — Compact & Clean */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-primary/25 bg-primary/5 shadow-xs">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-foreground">
                  MasterPanel Live Synchronized Templates
                </h2>
                <Badge variant="outline" className="text-[9px] sm:text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-1.5 py-0">
                  Realtime Synced
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                Live previews synced directly from MasterPanel. Designs can be edited from MasterPanel only.
              </p>
            </div>

            <a
              href="http://localhost:3002/sales/invoice-stickers"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs shrink-0 self-start sm:self-center w-full sm:w-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open MasterPanel Design Studio</span>
            </a>
          </div>

          {/* FULL PREVIEW SECTIONS LIST */}
          <div className="space-y-6">

            {/* 1. LUXURY A4 TAX INVOICE */}
            <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/80 bg-card space-y-3.5 sm:space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2 flex-wrap">
                      <span>Official Tax Invoice</span>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0 bg-muted/60">
                        A4 (210 × 297 mm)
                      </Badge>
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Gold &amp; cherry imperial corporate tax invoice layout synced from MasterPanel</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-muted/50 border border-border/60 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setInvoiceZoom((z) => Math.max(30, z - 10))}
                      title="Zoom Out"
                      className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceZoom(typeof window !== "undefined" && window.innerWidth < 640 ? 42 : 100)}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-background text-primary shadow-2xs cursor-pointer"
                      title="Auto Fit to Screen"
                    >
                      {invoiceZoom}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceZoom((z) => Math.min(150, z + 10))}
                      title="Zoom In"
                      className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleTestPrintInvoice}
                    className="h-8 sm:h-8.5 px-3 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer grow sm:grow-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Test Print A4 Invoice</span>
                  </Button>
                </div>
              </div>

              {/* Scaled A4 Full Viewport (Zero Cut-Off) */}
              <div className="w-full rounded-xl sm:rounded-2xl border border-amber-900/20 bg-[#E8E4DB] dark:bg-[#1A1513] p-2 sm:p-8 flex justify-center overflow-x-auto">
                <div
                  style={{
                    width: `${(210 * 3.7795 * invoiceZoom) / 100}px`,
                    height: `${(297 * 3.7795 * invoiceZoom) / 100}px`,
                    position: "relative",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.22)",
                    borderRadius: "4px",
                    flexShrink: 0,
                    overflow: "hidden",
                    background: "#FDFBF7",
                    transition: "width 0.15s ease, height 0.15s ease",
                  }}
                  className="border border-[#C5A059]/40"
                >
                  <div
                    style={{
                      width: "210mm",
                      height: "297mm",
                      transform: `scale(${invoiceZoom / 100})`,
                      transformOrigin: "top left",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  >
                    <iframe
                      srcDoc={renderedInvoiceHtml}
                      title="MasterPanel Official Invoice Preview"
                      className="w-full h-full border-0 block"
                      style={{ width: "210mm", height: "297mm", overflow: "hidden" }}
                      scrolling="no"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 80MM THERMAL POS RECEIPT SLIP */}
            <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/80 bg-card space-y-3.5 sm:space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2 flex-wrap">
                      <span>Thermal POS Receipt Slip</span>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0 bg-muted/60">
                        {posSettings?.printer_width || "80mm"} ESC/POS
                      </Badge>
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Counter point-of-sale thermal roll receipt ticket synced from MasterPanel</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-muted/50 border border-border/60 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPosZoom((z) => Math.max(60, z - 10))}
                      title="Zoom Out"
                      className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosZoom(100)}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-background text-primary shadow-2xs cursor-pointer"
                    >
                      {posZoom}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosZoom((z) => Math.min(150, z + 10))}
                      title="Zoom In"
                      className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleTestPrintPos}
                    className="h-8 sm:h-8.5 px-3 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer grow sm:grow-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Test Print 80mm POS Slip</span>
                  </Button>
                </div>
              </div>

              {/* Scaled Thermal POS Roll Viewport (Zero Cut-Off) */}
              <div className="w-full rounded-xl sm:rounded-2xl border border-border/60 bg-[#E8E4DB] dark:bg-[#1A1513] p-2 sm:p-8 flex justify-center overflow-x-auto">
                <div
                  style={{
                    width: `${(3.15 * 96 * posZoom) / 100}px`,
                    height: `${(860 * posZoom) / 100}px`,
                    position: "relative",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.22)",
                    borderRadius: "4px",
                    flexShrink: 0,
                    overflow: "hidden",
                    background: "#FDFBF7",
                    transition: "width 0.15s ease, height 0.15s ease",
                  }}
                  className="border border-[#C5A059]/40"
                >
                  <div
                    style={{
                      width: "3.15in",
                      height: "860px",
                      transform: `scale(${posZoom / 100})`,
                      transformOrigin: "top left",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  >
                    <iframe
                      srcDoc={renderedPosSlipHtml}
                      title="MasterPanel POS Slip Preview"
                      className="w-full h-full border-0 block"
                      style={{ width: "3.15in", height: "860px", overflow: "hidden" }}
                      scrolling="no"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. ORDER SHIPPING & DISPATCH STICKER */}
            <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/80 bg-card space-y-3.5 sm:space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2 flex-wrap">
                      <span>Order Shipping &amp; Dispatch Sticker</span>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0 bg-muted/60">
                        4" × 2" Courier Label
                      </Badge>
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Large recipient name &amp; delivery address with ORIZINO logo on left and tracking QR</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-muted/50 border border-border/60 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOrderStickerZoom((z) => Math.max(60, z - 15))}
                      title="Zoom Out"
                      className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderStickerZoom(100)}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-background text-primary shadow-2xs cursor-pointer"
                    >
                      {orderStickerZoom}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderStickerZoom((z) => Math.min(180, z + 15))}
                      title="Zoom In"
                      className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleTestPrintOrderSticker}
                    className="h-8 sm:h-8.5 px-3 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer grow sm:grow-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Test Print 4"×2" Sticker</span>
                  </Button>
                </div>
              </div>

              {/* Centered Order Sticker Live Preview Canvas */}
              <div className="w-full rounded-xl sm:rounded-2xl border border-border/60 bg-[#E8E4DB] dark:bg-[#1A1513] p-4 sm:p-8 flex items-center justify-center overflow-x-auto">
                <div
                  style={{
                    width: `${(4.0 * 96 * orderStickerZoom) / 100}px`,
                    height: `${(2.0 * 96 * orderStickerZoom) / 100}px`,
                    position: "relative",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    borderRadius: "2px",
                    flexShrink: 0,
                    overflow: "hidden",
                    transition: "width 0.15s ease, height 0.15s ease",
                  }}
                  className="border border-[#C5A059]/40 bg-[#FDFBF7]"
                >
                  <div
                    style={{
                      width: "4.0in",
                      height: "2.0in",
                      transform: `scale(${orderStickerZoom / 100})`,
                      transformOrigin: "top left",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  >
                    <iframe
                      srcDoc={renderedOrderStickerHtml}
                      title="Order Shipping Sticker Live Preview"
                      className="border-0 block"
                      style={{
                        width: "4.0in",
                        height: "2.0in",
                        overflow: "hidden",
                      }}
                      scrolling="no"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. PRODUCT TAG & SERIAL BARCODE STICKER */}
            <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/80 bg-card space-y-3.5 sm:space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2 flex-wrap">
                      <span>Product Tag &amp; Serial Barcode Sticker</span>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0 bg-muted/60">
                        {productStickerPreset?.width_in || 2}" × {productStickerPreset?.height_in || 0.65}" Hangtag
                      </Badge>
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Thermal barcode hangtag &amp; item verification serial label synced from MasterPanel</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap w-full sm:w-auto">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-muted/50 border border-border/60 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setProductStickerZoom((z) => Math.max(100, z - 25))}
                      title="Zoom Out"
                      className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductStickerZoom(200)}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-background text-primary shadow-2xs cursor-pointer"
                    >
                      {productStickerZoom}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductStickerZoom((z) => Math.min(300, z + 25))}
                      title="Zoom In"
                      className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <select
                    value={selectedProductId || (products[0]?.id ?? "")}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="h-8 sm:h-8.5 px-2.5 rounded-xl bg-background border border-border text-xs font-semibold cursor-pointer max-w-[140px] sm:max-w-xs truncate"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (৳{p.price})
                      </option>
                    ))}
                  </select>

                  <Button
                    size="sm"
                    onClick={() => {
                      if (!productStickerRef.current) return;
                      const printWin = window.open("", "_blank", "width=600,height=600");
                      if (!printWin) {
                        toast.error("Popup blocked. Please allow popups to print.");
                        return;
                      }
                      printWin.document.write(`
                        <html>
                          <head>
                            <title>Test Print Product Sticker</title>
                            <style>
                              @page { margin: 0; size: auto; }
                              body { margin: 10px; font-family: sans-serif; display: flex; justify-content: center; align-items: center; }
                            </style>
                          </head>
                          <body>
                            ${productStickerRef.current.innerHTML}
                            <script>window.onload = function() { window.print(); window.close(); }<\/script>
                          </body>
                        </html>
                      `);
                      printWin.document.close();
                      toast.success("Opening Product Sticker for Test Print…");
                    }}
                    className="h-8 sm:h-8.5 px-3 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer shrink-0 grow sm:grow-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Test Print Product Sticker</span>
                  </Button>
                </div>
              </div>

              {/* Centered Scaled Product Sticker Live Preview Canvas */}
              <div className="w-full rounded-xl sm:rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-10 flex flex-col items-center justify-center gap-3 sm:gap-4 overflow-x-auto">
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-muted-foreground bg-background/80 px-2.5 sm:px-3 py-1 rounded-full border border-border/60 shadow-2xs">
                  <span>{(productStickerPreset?.width_in || 2).toFixed(2)}" W</span>
                  <span>×</span>
                  <span>{(productStickerPreset?.height_in || 0.65).toFixed(2)}" H</span>
                  <span>•</span>
                  <span>{productStickerPreset?.border_style?.toUpperCase() || "SOLID"} Frame</span>
                </div>

                <div
                  style={{
                    transform: `scale(${productStickerZoom / 100})`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease",
                    margin: `${Math.max(0, (productStickerZoom - 100) * 0.45)}px 0`,
                  }}
                >
                  <div ref={productStickerRef} className="shadow-lg rounded-[2px] overflow-hidden bg-white">
                    <Sticker
                      data={{
                        serialCode: customSerialText || "TS01BL-001",
                        productName: selectedProduct?.name || "Premium Oxford Shirt",
                        size: selectedProduct?.product_variants?.[0]?.size || "L",
                        price: selectedProduct?.price || 2450,
                        compareAtPrice: selectedProduct?.compare_at_price || 2950,
                        brand: productStickerPreset?.brand_name || mpBrand?.name || "ORIZINO",
                        currency: productStickerPreset?.currency_symbol || mpBrand?.currency || "৳",
                        showSize: productStickerPreset?.show_size ?? true,
                        showOriginalPrice: productStickerPreset?.show_original_price ?? true,
                        config: productStickerPreset || undefined,
                      }}
                    />
                  </div>
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-mono">
                  Scale: {productStickerZoom}% (Physical: {(productStickerPreset?.width_in || 2).toFixed(2)}" × {(productStickerPreset?.height_in || 0.65).toFixed(2)}")
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MANUAL STATUS EDIT MODAL */}
      {editingSerial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border/80 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground">Edit Serial Status</h3>
                <p className="text-xs font-mono text-muted-foreground">{editingSerial.serial_code}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSerial(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-semibold text-foreground">{editingSerial.products?.name || "Product"}</p>
                <p className="text-muted-foreground font-mono text-[11px]">SKU: {editingSerial.products?.sku || "N/A"}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">New Status:</Label>
                <select
                  value={editStatusValue}
                  onChange={(e) => setEditStatusValue(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold cursor-pointer"
                >
                  <option value="available">Available (In Warehouse Stock)</option>
                  <option value="sold">Sold (Dispatched to Customer)</option>
                  <option value="returned">Returned</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {editStatusValue === "returned" && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                  <input
                    type="checkbox"
                    id="defectiveCheck"
                    checked={editIsDefective}
                    onChange={(e) => setEditIsDefective(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer accent-primary"
                  />
                  <Label htmlFor="defectiveCheck" className="text-xs font-semibold cursor-pointer">
                    Mark as defective (Isolate from sellable inventory)
                  </Label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingSerial(null)}
                className="rounded-xl h-9 px-4 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveManualStatus}
                disabled={isUpdatingStatus}
                className="rounded-xl h-9 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isUpdatingStatus ? "Saving…" : "Save Status"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MINI SCANNER OVERLAY MODAL */}
      {isMiniScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-card w-full max-w-2xl rounded-3xl border border-border/80 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Scanner Header */}
            <div className="p-4 border-b border-border/60 flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-primary animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm text-foreground">Scan to Update Status</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {isContinuousMode ? "Continuous Multi-Scan Batch Mode" : "Single Scan Instant Status Mode"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsContinuousMode(!isContinuousMode);
                    setSingleActiveScan(null);
                  }}
                  className={`rounded-xl h-8 px-2.5 text-[11px] font-bold gap-1 ${
                    isContinuousMode ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground"
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>{isContinuousMode ? "Continuous Mode" : "Single Mode"}</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setIsMiniScannerOpen(false)}
                  className="p-1.5 rounded-xl bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Camera Viewfinder */}
            <div className="p-4 bg-black/90 flex flex-col items-center justify-center relative min-h-[220px]">
              <BarcodeScanner
                onScan={handleMiniScan}
                onToggle={() => setIsMiniScannerOpen(false)}
                active={isMiniScannerOpen}
              />
            </div>

            {/* Single Scan Mode Prompt */}
            {!isContinuousMode && singleActiveScan && (
              <div className="p-4 bg-primary/10 border-t border-border/60 space-y-3 animate-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-primary">Scanned Item:</span>
                    <p className="font-bold text-sm text-foreground">{singleActiveScan.productName}</p>
                    <p className="text-xs font-mono text-muted-foreground">{singleActiveScan.serialCode}</p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-secondary uppercase">
                    Current: {singleActiveScan.currentStatus}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={singleActiveScan.targetStatus}
                    onChange={(e) =>
                      setSingleActiveScan({
                        ...singleActiveScan,
                        targetStatus: e.target.value,
                      })
                    }
                    className="flex-1 h-9 px-3 rounded-xl bg-background border border-border text-xs font-semibold cursor-pointer"
                  >
                    <option value="available">Set to Available (Stock)</option>
                    <option value="sold">Set to Sold (Dispatched)</option>
                    <option value="returned">Set to Returned</option>
                    <option value="cancelled">Set to Cancelled</option>
                  </select>

                  <Button
                    size="sm"
                    onClick={handleSaveSingleScanStatus}
                    className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Continuous Mode Scanned List */}
            {isContinuousMode && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-card border-t border-border/60">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">
                    Scanned Queue ({miniScannedList.length} items)
                  </p>
                  <Button
                    size="sm"
                    onClick={handleSaveBatchStatuses}
                    disabled={miniScannedList.length === 0 || isSavingMiniBatch}
                    className="h-8 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingMiniBatch ? "Saving…" : "Save All Updates"}</span>
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {miniScannedList.map((item) => (
                    <div
                      key={item.serialId}
                      className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground">{item.productName}</p>
                        <p className="text-[11px] font-mono text-muted-foreground">{item.serialCode}</p>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-primary uppercase">
                        → {item.targetStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
