"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Tag, ScanLine, QrCode, Printer, RefreshCw, Plus, Trash2, Upload, Download, Copy, Lock, Unlock, FileUp, Keyboard, Info, Pencil, FileImage, FileDown, Settings2, ExternalLink, Sliders, CheckSquare, Square, PackageSearch, X, CheckCheck, ArrowLeftRight, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Boxes, FileSpreadsheet, TrendingUp, CheckCircle2, Clock, Filter, Check, AlertCircle, AlertTriangle, Eye, Search, MoreHorizontal, Layers, Type, History, TerminalSquare } from "lucide-react";
import { useTabParam } from "@/hooks/use-tab-param";
import {
  listSerials,
  generateSerials,
  importSerials,
  scanSerial,
  deleteSerial,
  lookupSerial,
  syncStockFromSerials,
  manualAddSerial,
  markSerialsPrinted,
  getStickerSettings,
  updateStickerSettings,
  listStickerPresets,
  createStickerPreset,
  activateStickerPreset,
  deleteStickerPreset,
  duplicateStickerPreset,
  importStickerPresets,
} from "@/lib/serials.functions";

import { pushSerialsToSheet, pullSerialsFromSheet, testSheetConnection, getSheetMapping, saveSheetMapping } from "@/lib/serials-sheets.functions";
import { GoogleSheetsConfigModal } from "@/components/admin/GoogleSheetsConfigModal";
import { reassignSerial, searchOrdersForAssignment } from "@/lib/offline-orders.functions";
import { Sticker, type StickerData, type StickerConfig } from "@/components/admin/products/Sticker";
import { validateStickerConfig, stickersToPdfBlob, stickersToJpegSheetBlob, stickerDataToJpegBlob, downloadBlob } from "@/lib/sticker-utils";
import { BarcodeScanner } from "@/components/admin/products/BarcodeScanner";
import { ScannerHistoryPanel, ScannerTestPanel, ScannerSettingsButton } from "@/components/admin/products/ScannerPanels";
import { pushScan, useScannerPrefs } from "@/lib/scanner-prefs";
import { useScannerAccess, useScannerAudit } from "@/hooks/use-scanner-access";
import { Lock as LockIcon } from "lucide-react";
import SectionLoader from "@/components/loaders/SectionLoader";
import AdminProducts from "@/_pages/admin/AdminProducts";
import AdminCategories from "@/_pages/admin/AdminCategories";
const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  sold: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  cancelled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  returned: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  defective: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function AdminProductsManagement() {
  const [tab, setTab] = useTabParam("products", "/sales/products-management");

  const titles: Record<string, { title: string; desc: string }> = {
    products:   { title: "Products",       desc: "Product catalogue" },
    categories: { title: "Categories",     desc: "Category tree and filters" },
    stock:      { title: "Stock & Serials", desc: "Serial numbers and inventory" },
    scanner:    { title: "Product Scanner", desc: "Scan serials for sale, return or write-off" },
    sticker:    { title: "Sticker Setup",   desc: "Brand and layout for printed stickers" },
  };
  const meta = titles[tab] ?? titles.products;

  // Background auto-reconciliation across sheets, serials, and products
  useEffect(() => {
    syncStockFromSerials({}).catch(() => {});
  }, [tab]);

  return (
    <div className="space-y-6 pb-8">
      {tab !== "products" && tab !== "categories" && (
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold flex items-center gap-2">
            {tab === "sticker" ? (
              <Printer className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            ) : tab === "scanner" ? (
              <ScanLine className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            ) : (
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            )}
            {meta.title}
          </h1>
          <p className="text-sm text-muted-foreground">{meta.desc}</p>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab as any} className="w-full">
        <TabsContent value="products" className="mt-0"><AdminProducts /></TabsContent>
        <TabsContent value="categories" className="mt-0"><AdminCategories /></TabsContent>
        <TabsContent value="stock" className="mt-0"><StockAndSerialsTab /></TabsContent>
        <TabsContent value="scanner" className="mt-0"><ScannerTab /></TabsContent>
        <TabsContent value="sticker" className="mt-0"><StickerSetupTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Stock & Serials ---------------- */

/* ---------------- Stock & Serials Tab (Redesigned) ---------------- */

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  available: {
    label: "Available",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
  },
  sold: {
    label: "Sold",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
    dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    dot: "bg-amber-500",
  },
  returned: {
    label: "Returned",
    badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25",
    dot: "bg-orange-500",
  },
  defective: {
    label: "Defective",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
    dot: "bg-rose-500",
  },
};

function StockAndSerialsTab() {
  const qc = useQueryClient();
  const list = useServerFn(listSerials);
  const pushFn = useServerFn(pushSerialsToSheet);
  const pullFn = useServerFn(pullSerialsFromSheet);
  const testFn = useServerFn(testSheetConnection);
  const getMapFn = useServerFn(getSheetMapping);
  const saveMapFn = useServerFn(saveSheetMapping);
  const del = useServerFn(deleteSerial);
  const syncFn = useServerFn(syncStockFromSerials);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [bulkExportOpen, setBulkExportOpen] = useState(false);
  const [printCodes, setPrintCodes] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reassignRow, setReassignRow] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapDraft, setMapDraft] = useState<string>("");
  const [mapFields, setMapFields] = useState<readonly string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Query filtered serials
  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["serials", search, status],
    queryFn: () => list({ data: { search: search.trim() || undefined, status: status === "all" ? undefined : status } }),
  });

  // Query all serials for global overview metric cards
  const { data: allRows = [] } = useQuery({
    queryKey: ["serials-all-stats"],
    queryFn: () => list({ data: {} }),
  });

  // Computed metrics
  const stats = useMemo(() => {
    const total = allRows.length;
    const available = allRows.filter((r: any) => r.status === "available").length;
    const sold = allRows.filter((r: any) => r.status === "sold").length;
    const cancelled = allRows.filter((r: any) => r.status === "cancelled").length;
    const returned = allRows.filter((r: any) => r.status === "returned").length;
    const defective = allRows.filter((r: any) => r.status === "defective").length;
    const printed = allRows.filter((r: any) => (r.print_count || 0) > 0).length;
    const availablePct = total > 0 ? Math.round((available / total) * 100) : 0;
    const soldPct = total > 0 ? Math.round((sold / total) * 100) : 0;
    return { total, available, sold, cancelled, returned, defective, printed, availablePct, soldPct };
  }, [allRows]);

  // Paginated slice of current filtered rows
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  // Adjust page if out of bounds after filtering
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Copied to clipboard", description: code });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const push = useMutation({
    mutationFn: () => pushFn(),
    onSuccess: (r: any) => toast({ title: "Synced to Google Sheets", description: `${r.pushed} rows pushed` }),
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const pull = useMutation({
    mutationFn: () => pullFn(),
    onSuccess: (r: any) => {
      toast({ title: "Pulled from Google Sheets", description: `${r.updated} serials updated` });
      qc.invalidateQueries({ queryKey: ["serials"] });
      qc.invalidateQueries({ queryKey: ["serials-all-stats"] });
    },
    onError: (e: any) => toast({ title: "Pull failed", description: e.message, variant: "destructive" }),
  });

  const test = useMutation({
    mutationFn: () => testFn({ data: {} }),
    onSuccess: (r: any) => {
      setTestResult(r);
      toast({ title: r.ok ? "Sheet test passed" : "Sheet test failed", variant: r.ok ? undefined : "destructive" });
    },
    onError: (e: any) => {
      setTestResult({ ok: false, steps: [{ step: "Test", ok: false, detail: e.message }] });
      toast({ title: "Sheet test failed", description: e.message, variant: "destructive" });
    },
  });

  const openMapping = async () => {
    try {
      const r: any = await getMapFn();
      setMapDraft(JSON.stringify(r.mapping, null, 2));
      setMapFields(r.fields || []);
      setMapOpen(true);
    } catch (e: any) {
      toast({ title: "Failed to load mapping", description: e.message, variant: "destructive" });
    }
  };

  const saveMapping = useMutation({
    mutationFn: async () => {
      const mapping = JSON.parse(mapDraft);
      return saveMapFn({ data: { mapping } });
    },
    onSuccess: () => { toast({ title: "Column mapping saved" }); setMapOpen(false); },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["serials"] });
      qc.invalidateQueries({ queryKey: ["serials-all-stats"] });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await del({ data: { id } });
    },
    onSuccess: () => {
      setSelected({});
      qc.invalidateQueries({ queryKey: ["serials"] });
      qc.invalidateQueries({ queryKey: ["serials-all-stats"] });
      toast({ title: "Deleted selected serials" });
    },
    onError: (e: any) => toast({ title: "Bulk delete failed", description: e.message, variant: "destructive" }),
  });

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selectedCodes = rows.filter((r: any) => selected[r.id]).map((r: any) => r.serial_code);
  const allCurrentPageSelected = pagedRows.length > 0 && pagedRows.every((r: any) => selected[r.id]);

  const toggleCurrentPage = () => {
    if (allCurrentPageSelected) {
      setSelected((prev) => {
        const next = { ...prev };
        pagedRows.forEach((r: any) => delete next[r.id]);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = { ...prev };
        pagedRows.forEach((r: any) => { next[r.id] = true; });
        return next;
      });
    }
  };

  const sync = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r: any) => {
      toast({ title: "Stock recomputed", description: `${r.variantsUpdated} variant(s) and ${r.productsUpdated} product(s) synced from serials` });
      qc.invalidateQueries({ queryKey: ["serials"] });
      qc.invalidateQueries({ queryKey: ["serials-all-stats"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-select"] });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Top KPI Summary Cards (Mobile 2x2, Desktop 4-Col) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Total Serials */}
        <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-md p-3 sm:p-4 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Tracked</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <div className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">{stats.total.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              <span>{stats.printed} printed</span>
              <span>·</span>
              <span>{stats.total - stats.printed} unprinted</span>
            </div>
          </div>
        </div>

        {/* Card 2: Available Stock */}
        <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-md p-3 sm:p-4 shadow-xs flex flex-col justify-between hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Stock</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <div className="text-xl sm:text-2xl font-bold font-display text-emerald-500 tracking-tight">{stats.available.toLocaleString()}</div>
              <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                {stats.availablePct}% ready
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">Ready for sale</p>
          </div>
        </div>

        {/* Card 3: Sold & Dispatched */}
        <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-md p-3 sm:p-4 shadow-xs flex flex-col justify-between hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sold &amp; Fulfilled</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <div className="text-xl sm:text-2xl font-bold font-display text-blue-500 tracking-tight">{stats.sold.toLocaleString()}</div>
              <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/30">
                {stats.soldPct}% sold
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">Assigned to orders</p>
          </div>
        </div>

        {/* Card 4: Google Sheets Cloud Hub */}
        <div
          onClick={() => setSheetsModalOpen(true)}
          className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-md p-3 sm:p-4 shadow-xs flex flex-col justify-between hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer group"
          title="Click to open Google Sheets 2-Way Sync & Setup"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-emerald-500 transition-colors">Cloud Sheets</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-semibold text-foreground">Google Sheets</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
              <span>Open 2-Way Sync Hub</span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </p>
          </div>
        </div>
      </div>

      {/* 2. Responsive Action Command Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-muted/25 p-2.5 sm:p-3 rounded-xl border border-border/60">
        {/* Search Input + Compact 1-Button Filter */}
        <div className="flex items-center gap-2 flex-1 w-full sm:max-w-xl">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search serial, product, SKU…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-8 h-9 text-xs bg-background rounded-lg border-border/70 w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Compact 1-Button Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 text-xs gap-1.5 border-border/70 bg-background hover:bg-muted font-medium shrink-0 px-2.5 sm:px-3 ${
                  status !== "all" ? "border-primary/40 text-primary bg-primary/5" : "text-foreground"
                }`}
              >
                <Filter className="w-3.5 h-3.5 opacity-70" />
                {status === "all" ? (
                  <span>Status</span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold max-w-[80px] sm:max-w-none truncate">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[status]?.dot || "bg-primary"}`} />
                    <span className="truncate">{STATUS_CONFIG[status]?.label || status}</span>
                  </span>
                )}
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  status !== "all" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {status === "all" ? stats.total : (stats as any)[status] ?? 0}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 text-xs">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Filter by Status</span>
                {status !== "all" && (
                  <button
                    type="button"
                    onClick={() => { setStatus("all"); setPage(1); }}
                    className="text-primary hover:underline text-[10px] font-normal cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { id: "all", label: "All Serials", count: stats.total },
                { id: "available", label: "Available", count: stats.available, dot: "bg-emerald-500" },
                { id: "sold", label: "Sold", count: stats.sold, dot: "bg-blue-500" },
                { id: "cancelled", label: "Cancelled", count: stats.cancelled, dot: "bg-amber-500" },
                { id: "returned", label: "Returned", count: stats.returned, dot: "bg-orange-500" },
                { id: "defective", label: "Defective", count: stats.defective, dot: "bg-rose-500" },
              ].map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => { setStatus(item.id); setPage(1); }}
                  className={`flex items-center justify-between text-xs cursor-pointer py-1.5 ${
                    status === item.id ? "bg-accent font-semibold text-accent-foreground" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.dot ? (
                      <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    )}
                    <span>{item.label}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    status === item.id ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"
                  }`}>
                    {item.count}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Action Buttons: Responsive for Mobile & Desktop */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {/* Mobile-Only Actions Dropdown */}
          <div className="flex sm:hidden items-center gap-2 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="h-9 px-2.5 text-xs gap-1.5 border-border/70 bg-background"
              title="Sync stock counts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sync.isPending ? "animate-spin text-primary" : "text-muted-foreground"}`} />
              <span>{sync.isPending ? "…" : "Sync"}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-2.5 text-xs gap-1 border-border/70 bg-background">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  <span>More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 text-xs">
                <DropdownMenuLabel className="text-[11px] text-muted-foreground">Inventory Tools</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setManualAddOpen(true)} className="gap-2 cursor-pointer">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                  <span>Manual Add Serial</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkExportOpen(true)} className="gap-2 cursor-pointer">
                  <PackageSearch className="w-4 h-4 text-muted-foreground" />
                  <span>Bulk Labels Export</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Google Sheets</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">Free API</Badge>
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSheetsModalOpen(true)} className="gap-2 cursor-pointer font-semibold text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Open 2-Way Sync Hub</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => pull.mutate()} disabled={pull.isPending} className="gap-2 cursor-pointer">
                  <Download className="w-4 h-4 text-primary" />
                  <span>Pull from Sheets</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => push.mutate()} disabled={push.isPending} className="gap-2 cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Push to Sheets</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop-Only Expanded Action Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="h-9 text-xs gap-1.5 border-border/70 bg-background hover:bg-muted"
              title="Recompute stock numbers for all variants from serials"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sync.isPending ? "animate-spin text-primary" : "text-muted-foreground"}`} />
              <span>{sync.isPending ? "Syncing…" : "Sync Stock"}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-border/70 bg-background hover:bg-emerald-500/5 hover:border-emerald-500/40">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>Google Sheets</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 text-xs">
                <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                  Google Sheets Integration
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSheetsModalOpen(true)} className="gap-2 cursor-pointer font-semibold text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Open 2-Way Sync Hub</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => pull.mutate()} disabled={pull.isPending} className="gap-2 cursor-pointer">
                  <Download className="w-4 h-4 text-primary" />
                  <span>Quick Pull Serials</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => push.mutate()} disabled={push.isPending} className="gap-2 cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Quick Push Serials</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSheetsModalOpen(true)} className="gap-2 cursor-pointer">
                  <Sliders className="w-4 h-4 text-purple-500" />
                  <span>Column Mapping & Settings</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={() => setManualAddOpen(true)} className="h-9 text-xs gap-1.5 border-border/70 bg-background hover:bg-muted">
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Manual Serial</span>
            </Button>

            <Button variant="outline" size="sm" onClick={() => setBulkExportOpen(true)} className="h-9 text-xs gap-1.5 border-border/70 bg-background hover:bg-muted">
              <PackageSearch className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Bulk Labels</span>
            </Button>
          </div>

          {/* Primary + Add Stock Action */}
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs shrink-0 px-3 sm:px-4"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock</span>
          </Button>
        </div>
      </div>

      {/* 3. Floating Batch Action Dock (When rows are checked) */}
      {selectedIds.length > 0 && (
        <div className="sticky top-3 sm:top-4 z-20 flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-2.5 sm:px-4 sm:py-3 rounded-xl border border-primary/40 bg-card/95 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-primary/15 flex items-center justify-center text-primary">
              <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="text-xs font-semibold text-foreground">
              {selectedIds.length} selected
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            <Button
              size="sm"
              onClick={() => setPrintCodes(selectedCodes)}
              className="h-7 sm:h-8 text-xs gap-1 sm:gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-2.5"
            >
              <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Print ({selectedCodes.length})</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 sm:h-8 text-xs gap-1 sm:gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 px-2"
              onClick={() => {
                if (confirm(`Delete ${selectedIds.length} serial(s) permanently?`)) {
                  bulkDelete.mutate(selectedIds);
                }
              }}
              disabled={bulkDelete.isPending}
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected({})}
              className="h-7 sm:h-8 text-xs text-muted-foreground hover:text-foreground px-2"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* 4. Serials Presentation: Mobile Card List vs Desktop Table */}
      <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden shadow-xs">
        {/* MOBILE VIEW: Compact Interactive Card List (Shown on screens < md) */}
        <div className="block md:hidden p-3 space-y-2.5">
          {/* Mobile Select-All Toggle Bar */}
          {pagedRows.length > 0 && (
            <div className="flex items-center justify-between pb-2 border-b border-border/50 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={toggleCurrentPage}
                className="flex items-center gap-2 hover:text-foreground font-medium"
              >
                {allCurrentPageSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                <span>{allCurrentPageSelected ? "Deselect page" : `Select all on page (${pagedRows.length})`}</span>
              </button>
              <span className="text-[11px] font-mono">{rows.length} total</span>
            </div>
          )}

          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl border border-border/50 bg-muted/20 animate-pulse space-y-2">
                <div className="flex justify-between">
                  <div className="w-24 h-4 bg-muted rounded" />
                  <div className="w-16 h-4 bg-muted rounded-full" />
                </div>
                <div className="w-40 h-4 bg-muted rounded" />
                <div className="w-28 h-3 bg-muted/60 rounded" />
              </div>
            ))
          ) : isError ? (
            <div className="py-8 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-destructive mx-auto" />
              <p className="text-xs font-semibold text-foreground">Could not load serials</p>
              <p className="text-[11px] text-muted-foreground font-mono">{(error as any)?.message}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-7">Retry</Button>
            </div>
          ) : pagedRows.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <PackageSearch className="w-8 h-8 opacity-40 mx-auto text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">No serials found</p>
              <p className="text-[11px] text-muted-foreground">Try adjusting search or filters.</p>
            </div>
          ) : (
            pagedRows.map((r: any) => {
              const statusCfg = STATUS_CONFIG[r.status] || {
                label: r.status,
                badge: "bg-muted text-muted-foreground border-border",
                dot: "bg-muted-foreground",
              };
              const isChecked = !!selected[r.id];

              return (
                <div
                  key={r.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isChecked ? "bg-primary/5 border-primary/40 shadow-xs" : "bg-card/70 border-border/60 hover:border-border"
                  }`}
                >
                  {/* Top Row: Checkbox + Monospace Serial + Status Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelected((s) => ({ ...s, [r.id]: !s[r.id] }))}
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                      >
                        {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 opacity-50" />}
                      </button>

                      <div className="inline-flex items-center gap-1 font-mono text-xs font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border/60 min-w-0">
                        <QrCode className="w-3 h-3 text-primary opacity-70 shrink-0" />
                        <span className="truncate">{r.serial_code}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(r.serial_code)}
                          className="text-muted-foreground hover:text-foreground shrink-0 ml-0.5"
                          title="Copy Serial Code"
                        >
                          {copiedCode === r.serial_code ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60" />
                          )}
                        </button>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${statusCfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      <span>{statusCfg.label}</span>
                    </span>
                  </div>

                  {/* Middle Row: Product Name + SKU + Variant Badges */}
                  <div className="mt-2 text-xs">
                    <div className="font-semibold text-foreground truncate" title={r.products?.name ?? "—"}>
                      {r.products?.name ?? "—"}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {r.products?.sku && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                          SKU: {r.products.sku}
                        </span>
                      )}
                      {(r.product_variants?.size || r.product_variants?.color) && (
                        <span className="text-[10px] font-medium text-foreground bg-muted/80 px-1.5 py-0.5 rounded border border-border/50">
                          {[r.product_variants?.size, r.product_variants?.color].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Print Count / Sold info + Quick Action Buttons */}
                  <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      {r.print_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <Check className="w-2.5 h-2.5" />
                          <span>Printed {r.print_count}×</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">Unprinted</span>
                      )}
                      {r.sold_at && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          · {new Date(r.sold_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPrintCodes([r.serial_code])}
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Print Label"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReassignRow(r)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Reassign / Edit Status"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete serial ${r.serial_code}?`)) remove.mutate(r.id);
                        }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Serial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP VIEW: Luxury 8-Column Data Table (Shown on screens >= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60">
              <tr>
                <th className="px-3.5 py-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleCurrentPage}
                    className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    title={allCurrentPageSelected ? "Deselect page" : "Select page"}
                  >
                    {allCurrentPageSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-3.5 py-3">Serial Code</th>
                <th className="text-left px-3.5 py-3">Product Name &amp; SKU</th>
                <th className="text-left px-3.5 py-3">Variant</th>
                <th className="text-left px-3.5 py-3">Status</th>
                <th className="text-left px-3.5 py-3">Sold &amp; Order</th>
                <th className="text-center px-3.5 py-3">Labels</th>
                <th className="px-3.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3.5 py-3.5 text-center"><div className="w-4 h-4 bg-muted rounded mx-auto" /></td>
                    <td className="px-3.5 py-3.5"><div className="w-28 h-4 bg-muted rounded" /></td>
                    <td className="px-3.5 py-3.5"><div className="w-48 h-4 bg-muted rounded mb-1" /><div className="w-20 h-3 bg-muted/60 rounded" /></td>
                    <td className="px-3.5 py-3.5"><div className="w-16 h-4 bg-muted rounded" /></td>
                    <td className="px-3.5 py-3.5"><div className="w-20 h-5 bg-muted rounded-full" /></td>
                    <td className="px-3.5 py-3.5"><div className="w-24 h-4 bg-muted rounded" /></td>
                    <td className="px-3.5 py-3.5 text-center"><div className="w-12 h-4 bg-muted rounded mx-auto" /></td>
                    <td className="px-3.5 py-3.5 text-right"><div className="w-16 h-4 bg-muted rounded ml-auto" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Could not load stock &amp; serials</span>
                      <p className="text-xs text-muted-foreground font-mono bg-muted/50 p-2.5 rounded-lg max-w-full overflow-x-auto">
                        {(error as any)?.message || "Database query failed"}
                      </p>
                      <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-1 gap-1.5 text-xs">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Connection</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                        <PackageSearch className="w-7 h-7 opacity-60" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">No serials found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search || status !== "all"
                            ? "No serial numbers match the current search filters."
                            : "No inventory serials tracked yet. Click below to add stock."}
                        </p>
                      </div>
                      {!search && status === "all" && (
                        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 text-xs mt-1">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Generate First Batch</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((r: any) => {
                  const statusCfg = STATUS_CONFIG[r.status] || {
                    label: r.status,
                    badge: "bg-muted text-muted-foreground border-border",
                    dot: "bg-muted-foreground",
                  };
                  const isChecked = !!selected[r.id];

                  return (
                    <tr
                      key={r.id}
                      className={`group transition-colors ${
                        isChecked ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3.5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelected((s) => ({ ...s, [r.id]: !s[r.id] }))}
                          className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        >
                          {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 opacity-50 group-hover:opacity-100" />}
                        </button>
                      </td>

                      {/* Serial Code */}
                      <td className="px-3.5 py-3">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground tracking-wide bg-background/80 px-2 py-0.5 rounded border border-border/60">
                          <QrCode className="w-3 h-3 text-primary opacity-70" />
                          <span>{r.serial_code}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(r.serial_code)}
                            className="text-muted-foreground hover:text-foreground ml-0.5 transition-colors"
                            title="Copy Serial Code"
                          >
                            {copiedCode === r.serial_code ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Product Name & SKU */}
                      <td className="px-3.5 py-3 max-w-[280px]">
                        <div className="font-medium text-xs text-foreground truncate" title={r.products?.name ?? "—"}>
                          {r.products?.name ?? "—"}
                        </div>
                        {r.products?.sku && (
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            SKU: {r.products.sku}
                          </div>
                        )}
                      </td>

                      {/* Variant */}
                      <td className="px-3.5 py-3">
                        {r.product_variants?.size || r.product_variants?.color ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/50">
                            {[r.product_variants?.size, r.product_variants?.color].filter(Boolean).join(" · ")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusCfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          <span>{statusCfg.label}</span>
                        </span>
                      </td>

                      {/* Sold / Order Info */}
                      <td className="px-3.5 py-3 text-xs text-muted-foreground">
                        {r.sold_at ? (
                          <div className="flex flex-col">
                            <span className="text-foreground font-medium text-[11px]">
                              {new Date(r.sold_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(r.sold_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Printed Counter Badge */}
                      <td className="px-3.5 py-3 text-center">
                        {r.print_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <Check className="w-2.5 h-2.5" />
                            <span>{r.print_count}×</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60">Unprinted</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPrintCodes([r.serial_code])}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Print Label (1-Col POS Roll)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReassignRow(r)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Reassign or Change Status"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete serial ${r.serial_code}?`)) remove.mutate(r.id);
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Serial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Responsive Pagination Footer */}
        {rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-border/60 bg-muted/15 text-xs text-muted-foreground">
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <span>
                Showing <strong>{(page - 1) * pageSize + 1}</strong>–<strong>{Math.min(page * pageSize, rows.length)}</strong> of <strong>{rows.length.toLocaleString()}</strong>
              </span>

              {/* Rows per page on mobile */}
              <div className="flex sm:hidden items-center gap-1">
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 text-xs w-[60px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
              {/* Rows per page on desktop */}
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[11px]">Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 text-xs w-[65px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page controls */}
              <div className="flex items-center gap-1 ml-auto sm:ml-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-2 font-medium text-foreground text-xs">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs and Modals */}
      {addOpen && (
        <AddStockDialog
          onClose={() => setAddOpen(false)}
          onCreated={(codes) => {
            setAddOpen(false);
            setPrintCodes(codes);
            qc.invalidateQueries({ queryKey: ["serials"] });
            qc.invalidateQueries({ queryKey: ["serials-all-stats"] });
          }}
        />
      )}
      {manualAddOpen && (
        <ManualAddSerialDialog
          onClose={() => setManualAddOpen(false)}
          onCreated={() => {
            setManualAddOpen(false);
            qc.invalidateQueries({ queryKey: ["serials"] });
            qc.invalidateQueries({ queryKey: ["serials-all-stats"] });
          }}
        />
      )}
      {bulkExportOpen && <BulkExportStickersDialog onClose={() => setBulkExportOpen(false)} />}
      {printCodes && <PrintStickersDialog codes={printCodes} onClose={() => setPrintCodes(null)} />}
      {reassignRow && (
        <ReassignSerialDialog
          row={reassignRow}
          onClose={() => setReassignRow(null)}
          onDone={() => {
            setReassignRow(null);
            qc.invalidateQueries({ queryKey: ["serials"] });
            qc.invalidateQueries({ queryKey: ["serials-all-stats"] });
          }}
        />
      )}

      {/* Sheet Diagnostic Test Modal */}
      <Dialog open={!!testResult} onOpenChange={(o) => !o && setTestResult(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span>Google Sheet Diagnostic Test</span>
              <Badge variant={testResult?.ok ? "outline" : "destructive"} className="text-xs">
                {testResult?.ok ? "Passed" : "Failed"}
              </Badge>
              {typeof testResult?.ms === "number" && (
                <span className="text-xs text-muted-foreground font-mono ml-auto">{testResult.ms} ms</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-xs py-1">
            {(testResult?.steps ?? []).map((s: any, i: number) => (
              <li key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/50">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  s.ok ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                }`}>
                  {s.ok ? "✓" : "✕"}
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{s.step}</div>
                  {s.detail && <div className="text-muted-foreground text-[11px] mt-0.5 break-all font-mono">{s.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
          {testResult?.warnings?.length > 0 && (
            <div className="rounded-lg border border-border p-2.5 space-y-1.5 max-h-52 overflow-auto bg-muted/20">
              <div className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Warnings &amp; Consistency ({testResult.warnings.length})</span>
              </div>
              <ul className="text-xs space-y-1">
                {testResult.warnings.map((w: any, i: number) => (
                  <li key={i} className={w.level === "error" ? "text-destructive" : "text-amber-500"}>
                    • <span className="uppercase text-[10px] font-semibold mr-1">{w.type}</span>{w.message}
                    {w.hint && <div className="ml-3 mt-0.5 text-[11px] text-muted-foreground"><span className="font-semibold">Fix:</span> {w.hint}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Sheets Column Mapping Modal */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              Google Sheets Column Mapping
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Configure header names and column offset indices. <code>headerRow</code> and <code>dataStartRow</code> are 1-based row indices. Available fields: <code>{mapFields.join(", ")}</code>.
          </p>
          <Textarea
            value={mapDraft}
            onChange={(e) => setMapDraft(e.target.value)}
            className="min-h-[300px] font-mono text-xs bg-background p-3 rounded-lg border-border/70"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMapping.mutate()} disabled={saveMapping.isPending} className="bg-primary text-primary-foreground">
              {saveMapping.isPending ? "Saving…" : "Save Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgraded Google Sheets 2-Way Sync & Setup Hub */}
      <GoogleSheetsConfigModal open={sheetsModalOpen} onOpenChange={setSheetsModalOpen} />
    </div>
  );
}

function AddStockDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (codes: string[]) => void }) {
  const gen = useServerFn(generateSerials);
  const imp = useServerFn(importSerials);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState<string>("");
  const [mode, setMode] = useState<"auto" | "manual" | "bulk">("auto");
  const [quantity, setQuantity] = useState(10);
  const [manualCodes, setManualCodes] = useState("");
  const [busy, setBusy] = useState(false);

  // ---- Bulk mode state ----
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkQtyMode, setBulkQtyMode] = useState<"auto" | "manual">("auto");
  const [bulkDefaultQty, setBulkDefaultQty] = useState(10);
  const [bulkSel, setBulkSel] = useState<Record<string, { selected: boolean; qty: number }>>({});

  const { data: products = [] } = useQuery({
    queryKey: ["products-select"],
    queryFn: async () => (await supabase.from("products").select("id, name, sku, stock_quantity, thumbnail").order("name").limit(500)).data ?? [],
  });
  const { data: variants = [] } = useQuery({
    queryKey: ["variants-select", productId],
    queryFn: async () => productId ? (await supabase.from("product_variants").select("id, size, color, sku, stock_quantity").eq("product_id", productId)).data ?? [] : [],
    enabled: !!productId,
  });

  const selectedProduct = (products as any[]).find((p: any) => p.id === productId);

  // Parse manual codes
  const manualCodesList = useMemo(() => {
    return manualCodes
      .split(/[\n,]+/)
      .map((c) => c.trim())
      .filter(Boolean);
  }, [manualCodes]);

  // Filter products for bulk mode
  const filteredProducts = useMemo(() => {
    const s = bulkSearch.trim().toLowerCase();
    if (!s) return products as any[];
    return (products as any[]).filter((p: any) => p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s));
  }, [products, bulkSearch]);

  const toggleBulk = (p: any) => {
    setBulkSel((prev) => {
      const cur = prev[p.id];
      const nextSel = !cur?.selected;
      const defaultQty = bulkQtyMode === "auto" ? (p.stock_quantity ?? bulkDefaultQty) : bulkDefaultQty;
      return {
        ...prev,
        [p.id]: { selected: nextSel, qty: cur?.qty ?? defaultQty },
      };
    });
  };

  const setBulkQty = (id: string, q: number) => {
    setBulkSel((prev) => ({
      ...prev,
      [id]: { selected: true, qty: Math.max(1, q) },
    }));
  };

  const selectAllFiltered = () => {
    const next: Record<string, { selected: boolean; qty: number }> = { ...bulkSel };
    for (const p of filteredProducts as any[]) {
      const defaultQty = bulkQtyMode === "auto" ? (p.stock_quantity ?? bulkDefaultQty) : bulkDefaultQty;
      next[p.id] = { selected: true, qty: bulkSel[p.id]?.qty ?? defaultQty };
    }
    setBulkSel(next);
  };

  const clearSelection = () => {
    setBulkSel({});
  };

  const selectedCount = Object.values(bulkSel).filter((v) => v.selected).length;
  const totalUnits = Object.values(bulkSel)
    .filter((v) => v.selected)
    .reduce((sum, v) => sum + (v.qty || 0), 0);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "auto") {
        if (!productId) {
          toast({ title: "Please pick a product", variant: "destructive" });
          setBusy(false);
          return;
        }
        const res: any = await gen({
          data: {
            productId,
            variantId: variantId || undefined,
            quantity,
          },
        });
        toast({
          title: "Serials generated",
          description: `Created ${res.created} serial numbers for inventory.`,
        });
        onCreated(res.codes || []);
      } else if (mode === "manual") {
        if (!productId) {
          toast({ title: "Please pick a product", variant: "destructive" });
          setBusy(false);
          return;
        }
        if (!manualCodesList.length) {
          toast({ title: "Paste at least one serial code", variant: "destructive" });
          setBusy(false);
          return;
        }
        const res: any = await imp({
          data: {
            productId,
            variantId: variantId || undefined,
            codes: manualCodesList,
          },
        });
        toast({
          title: "Serials imported",
          description: `Added ${res.imported} serial numbers.`,
        });
        onCreated(manualCodesList);
      } else {
        // Bulk mode
        const items = Object.entries(bulkSel)
          .filter(([_, v]) => v.selected && v.qty > 0)
          .map(([pid, v]) => ({ productId: pid, quantity: v.qty }));

        if (!items.length) {
          toast({ title: "No products selected", variant: "destructive" });
          setBusy(false);
          return;
        }

        let allCreatedCodes: string[] = [];
        for (const it of items) {
          const res: any = await gen({
            data: { productId: it.productId, quantity: it.quantity },
          });
          if (res.codes) allCreatedCodes.push(...res.codes);
        }

        toast({
          title: "Bulk generation complete",
          description: `Created ${allCreatedCodes.length} serials across ${items.length} products.`,
        });
        onCreated(allCreatedCodes);
      }
    } catch (e: any) {
      toast({
        title: "Action failed",
        description: e.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={mode === "bulk" ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        {/* Luxury Dialog Header */}
        <DialogHeader className="flex flex-row items-center gap-2.5 sm:gap-3 pb-3 border-b border-border/50">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 pr-6 sm:pr-0">
            <DialogTitle className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
              Add Stock &amp; Generate Serials
            </DialogTitle>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">
              Create authenticated QR serial numbers or import existing codes to track inventory.
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          {/* Luxury Segmented Mode Switcher */}
          <div className="bg-muted/50 p-1 rounded-xl border border-border/60 grid grid-cols-3 gap-1 text-[11px] sm:text-xs">
            <button
              type="button"
              onClick={() => setMode("auto")}
              className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                mode === "auto"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <QrCode className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Auto Generate</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                mode === "manual"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Manual Paste</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("bulk")}
              className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                mode === "bulk"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Boxes className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Catalog Bulk</span>
            </button>
          </div>

          {/* AUTO GENERATE MODE */}
          {mode === "auto" && (
            <div className="space-y-3 sm:space-y-4">
              {/* Target Product Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Target Product *</Label>
                  {selectedProduct && (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      In Stock: {selectedProduct.stock_quantity ?? 0} pcs
                    </span>
                  )}
                </div>
                <Select value={productId} onValueChange={(v) => { setProductId(v); setVariantId(""); }}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select product to generate serials for…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {(products as any[]).map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span className="font-medium truncate">{p.name}</span>
                          {p.sku && <span className="font-mono text-[10px] text-muted-foreground shrink-0">{p.sku}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Variant Selector (if available) */}
              {variants.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Product Variant (Size / Color)</Label>
                  <Select value={variantId || "none"} onValueChange={(v) => setVariantId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Choose variant..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">All Variants / Base Product (Universal)</SelectItem>
                      {variants.map((v: any) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                          {[v.size ? `Size: ${v.size}` : null, v.color ? `Color: ${v.color}` : null].filter(Boolean).join(" · ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quantity Stepper & Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Batch Quantity *</Label>
                  <span className="text-[11px] text-muted-foreground">1 to 500 units</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="h-9 text-sm font-semibold font-mono pr-12 bg-background"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
                      pcs
                    </span>
                  </div>
                  <div className="grid grid-cols-5 sm:flex items-center gap-1">
                    {[5, 10, 25, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantity(preset)}
                        className={`py-1.5 px-1 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-medium border text-center transition-colors ${
                          quantity === preset
                            ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                            : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Serial Code Pattern Preview */}
              {selectedProduct ? (
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-primary flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      Serial Code Pattern Preview
                    </span>
                    <span className="font-mono text-muted-foreground">
                      +{quantity} in this batch
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-foreground tracking-wide bg-background/80 px-2.5 py-1.5 rounded-lg border border-border/60 truncate">
                    {selectedProduct.sku
                      ? `${selectedProduct.sku}-000001`
                      : `ORZ-${selectedProduct.name.slice(0, 4).toUpperCase()}-000001`}
                    {" → "}
                    {selectedProduct.sku
                      ? `${selectedProduct.sku}-${String(quantity).padStart(6, "0")}`
                      : `ORZ-${selectedProduct.name.slice(0, 4).toUpperCase()}-${String(quantity).padStart(6, "0")}`}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Each serial is uniquely registered with status <strong className="text-emerald-500">Available</strong> and encodes a smart QR verification URL.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground text-center py-1">
                  Select a product above to preview the generated serial pattern.
                </p>
              )}
            </div>
          )}

          {/* MANUAL PASTE MODE */}
          {mode === "manual" && (
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Target Product *</Label>
                <Select value={productId} onValueChange={(v) => { setProductId(v); setVariantId(""); }}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select product to link serials to…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {(products as any[]).map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span className="font-medium truncate">{p.name}</span>
                          {p.sku && <span className="font-mono text-[10px] text-muted-foreground shrink-0">{p.sku}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {variants.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Product Variant (Size / Color)</Label>
                  <Select value={variantId || "none"} onValueChange={(v) => setVariantId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="No variant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">No specific variant</SelectItem>
                      {variants.map((v: any) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                          {[v.size ? `Size: ${v.size}` : null, v.color ? `Color: ${v.color}` : null].filter(Boolean).join(" · ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Paste Serial Codes *</Label>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {manualCodesList.length > 0 ? (
                      <span className="text-emerald-500 font-semibold">{manualCodesList.length} codes detected</span>
                    ) : (
                      "One per line or comma-separated"
                    )}
                  </span>
                </div>
                <textarea
                  value={manualCodes}
                  onChange={(e) => setManualCodes(e.target.value)}
                  placeholder={"ORZ-KENK0001W-0001\nORZ-KENK0001W-0002\nORZ-KENK0001W-0003"}
                  className="w-full h-28 sm:h-32 rounded-xl border border-input bg-background p-3 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  Paste existing barcodes or supplier serials to import them into inventory.
                </p>
              </div>
            </div>
          )}

          {/* CATALOG BULK MODE */}
          {mode === "bulk" && (
            <div className="space-y-2.5">
              {/* Search & Bulk Controls */}
              <div className="flex flex-col gap-2 bg-muted/30 p-2 sm:p-2.5 rounded-xl border border-border/50">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search catalog products…"
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    className="h-8 text-xs pl-8 bg-background w-full"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="inline-flex rounded-lg border border-input p-0.5 bg-background">
                    <button
                      type="button"
                      onClick={() => setBulkQtyMode("auto")}
                      className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs transition-colors ${
                        bulkQtyMode === "auto" ? "bg-primary text-primary-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Match Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkQtyMode("manual")}
                      className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs transition-colors ${
                        bulkQtyMode === "manual" ? "bg-primary text-primary-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Set Default
                    </button>
                  </div>
                  {bulkQtyMode === "manual" && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={bulkDefaultQty}
                        onChange={(e) => setBulkDefaultQty(parseInt(e.target.value) || 1)}
                        className="w-14 sm:w-16 h-7 sm:h-8 text-xs text-center font-mono bg-background"
                      />
                      <span className="text-[11px] text-muted-foreground">pcs</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs px-0.5">
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={selectAllFiltered} className="h-6 text-[11px] px-1.5 text-primary hover:bg-primary/10 font-medium">
                    Select all
                  </Button>
                  <span className="text-muted-foreground/40">·</span>
                  <Button size="sm" variant="ghost" onClick={clearSelection} className="h-6 text-[11px] px-1.5 text-muted-foreground hover:text-foreground">
                    Clear
                  </Button>
                </div>
                <div className="font-semibold text-foreground text-[11px] bg-muted/60 px-2 py-0.5 rounded-lg border border-border/40">
                  {selectedCount} products · <span className="text-primary">{totalUnits} serials</span>
                </div>
              </div>

              {/* Responsive Products List */}
              <div className="rounded-xl border border-border/70 max-h-[240px] sm:max-h-[280px] overflow-y-auto bg-card divide-y divide-border/50">
                {filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No matching products in catalog
                  </div>
                ) : (
                  (filteredProducts as any[]).map((p: any) => {
                    const sel = bulkSel[p.id];
                    const checked = !!sel?.selected;
                    const qty = sel?.qty ?? (bulkQtyMode === "auto" ? (p.stock_quantity ?? bulkDefaultQty) : bulkDefaultQty);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleBulk(p)}
                        className={`p-2 sm:px-3 sm:py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          checked ? "bg-primary/5" : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="shrink-0 text-primary">
                            {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-muted-foreground opacity-50" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs text-foreground truncate">{p.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 font-mono">
                              {p.sku && <span>{p.sku}</span>}
                              {p.sku && <span>·</span>}
                              <span>In Stock: {p.stock_quantity ?? 0}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            min={1}
                            max={500}
                            value={qty}
                            onChange={(e) => setBulkQty(p.id, parseInt(e.target.value) || 1)}
                            disabled={!checked}
                            className="w-16 sm:w-20 h-7 text-right text-xs font-mono font-semibold disabled:opacity-30 bg-background"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-border/50">
          <Button variant="outline" onClick={onClose} disabled={busy} className="text-xs h-9 w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy || (mode === "bulk" && totalUnits === 0)}
            className="text-xs h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs gap-1.5 w-full sm:w-auto"
          >
            {busy ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Processing…</span>
              </>
            ) : mode === "bulk" ? (
              <>
                <Boxes className="w-3.5 h-3.5" />
                <span>Create {totalUnits} Serials</span>
              </>
            ) : mode === "manual" ? (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Import {manualCodesList.length ? `${manualCodesList.length} ` : ""}Serials</span>
              </>
            ) : (
              <>
                <QrCode className="w-3.5 h-3.5" />
                <span>Generate {quantity} Serials</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ManualAddSerialDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const addFn = useServerFn(manualAddSerial);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState<string>("");
  const [serialCode, setSerialCode] = useState("");
  const [status, setStatus] = useState("available");
  const [busy, setBusy] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["products-select"],
    queryFn: async () => (await supabase.from("products").select("id, name, sku").order("name").limit(500)).data ?? [],
  });
  const { data: variants = [] } = useQuery({
    queryKey: ["variants-select", productId],
    queryFn: async () => productId ? (await supabase.from("product_variants").select("id, size, color").eq("product_id", productId)).data ?? [] : [],
    enabled: !!productId,
  });

  async function submit() {
    if (!productId) { toast({ title: "Choose a product", variant: "destructive" }); return; }
    if (!serialCode.trim()) { toast({ title: "Enter a serial code", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await addFn({ data: { productId, variantId: variantId || null, serialCode: serialCode.trim(), status: status as any } });
      toast({ title: "Serial added" });
      onCreated();
    } catch (e: any) {
      toast({ title: "Could not add serial", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center gap-3 pb-3 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Pencil className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
              Add a Serial Manually
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Register an existing physical item or barcode into the system.
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Product *</Label>
            <Select value={productId} onValueChange={(v) => { setProductId(v); setVariantId(""); }}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Select product…" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {(products as any[]).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="font-medium truncate">{p.name}</span>
                      {p.sku && <span className="font-mono text-[10px] text-muted-foreground shrink-0">{p.sku}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {variants.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Variant (Size / Color)</Label>
              <Select value={variantId || "none"} onValueChange={(v) => setVariantId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="No variant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">None / Base Product</SelectItem>
                  {(variants as any[]).map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {[v.size ? `Size: ${v.size}` : null, v.color ? `Color: ${v.color}` : null].filter(Boolean).join(" · ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Serial Code *</Label>
            <Input
              value={serialCode}
              onChange={(e) => setSerialCode(e.target.value)}
              placeholder="e.g. ORZ-KENK0001W-000001"
              className="font-mono text-xs h-9 bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Initial Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available" className="text-xs text-emerald-500 font-medium">Available (In Stock)</SelectItem>
                <SelectItem value="sold" className="text-xs text-blue-500 font-medium">Sold</SelectItem>
                <SelectItem value="cancelled" className="text-xs text-amber-500 font-medium">Cancelled</SelectItem>
                <SelectItem value="returned" className="text-xs text-orange-500 font-medium">Returned</SelectItem>
                <SelectItem value="defective" className="text-xs text-red-500 font-medium">Defective</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-border/50">
          <Button variant="outline" onClick={onClose} disabled={busy} className="text-xs h-9 w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs w-full sm:w-auto">
            {busy ? "Adding…" : "Add Serial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ReassignSerialDialog({ row, onClose, onDone }: { row: any; onClose: () => void; onDone: () => void }) {
  const reassignFn = useServerFn(reassignSerial);
  const searchOrdersFn = useServerFn(searchOrdersForAssignment);
  const [status, setStatus] = useState<string>(row.status);
  const [orderSearch, setOrderSearch] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(row.sold_order_id ?? null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);

  const doSearch = async (q: string) => {
    setOrderSearch(q);
    setSearching(true);
    try {
      const rows: any = await searchOrdersFn({ data: { search: q || undefined } });
      setOrders(rows ?? []);
    } catch {
      setOrders([]);
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    if (status === "sold" && !selectedOrderId) {
      toast({ title: "Pick an order to assign this serial to", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await reassignFn({ data: { serialId: row.id, newStatus: status as any, orderId: status === "sold" ? selectedOrderId : null } });
      toast({ title: "Serial updated", description: `${row.serial_code} → ${status}` });
      onDone();
    } catch (e: any) {
      toast({ title: "Could not update serial", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit status / assign order — {row.serial_code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="defective">Defective</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "sold" && (
            <div className="space-y-2">
              <Label className="text-xs">Assign to order</Label>
              <Input
                placeholder="Search order number…"
                value={orderSearch}
                onChange={(e) => void doSearch(e.target.value)}
                onFocus={() => { if (!orders.length) void doSearch(""); }}
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {searching ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                ) : orders.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No orders found</div>
                ) : (
                  orders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelectedOrderId(o.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between ${selectedOrderId === o.id ? "bg-primary/10" : ""}`}
                    >
                      <span>
                        <span className="font-mono">{o.order_number}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{o.customer_name ?? ""}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{o.status}</span>
                    </button>
                  ))
                )}
              </div>
              {selectedOrderId && (
                <p className="text-xs text-muted-foreground">
                  Will assign to {orders.find((o) => o.id === selectedOrderId)?.order_number ?? selectedOrderId}. This updates that order's items, totals, and invoice.
                </p>
              )}
            </div>
          )}

          {status !== "sold" && row.sold_order_id && (
            <p className="text-xs text-muted-foreground">
              This serial is currently linked to an order. Changing status away from "Sold" will remove it from that order's line items and recalculate its total (the order is cancelled automatically if it's left with no items).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function BulkExportStickersDialog({ onClose }: { onClose: () => void }) {
  const listFn = useServerFn(listSerials);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState(true);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolvedCodes, setResolvedCodes] = useState<string[] | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products-select"],
    queryFn: async () => (await supabase.from("products").select("id, name, sku").order("name").limit(1000)).data ?? [],
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return products as any[];
    return (products as any[]).filter((p) => p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s));
  }, [products, search]);

  const toggle = (id: string) => {
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  async function resolve() {
    if (!allProducts && selectedProductIds.length === 0) {
      toast({ title: "Select at least one product, or choose All products", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const r: any = await listFn({
        data: {
          productIds: allProducts ? undefined : selectedProductIds,
          status: onlyAvailable ? "available" : undefined,
          limit: 5000,
        },
      });
      const codes = (r ?? []).map((row: any) => row.serial_code);
      if (!codes.length) { toast({ title: "No matching serials found", variant: "destructive" }); return; }
      setResolvedCodes(codes);
    } catch (e: any) {
      toast({ title: "Could not load serials", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (resolvedCodes) {
    // Hand off to the same export/print/layout UI used for single-row printing.
    return <PrintStickersDialog codes={resolvedCodes} onClose={onClose} />;
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk export stickers</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">All products</p>
            <p className="text-[11px] text-muted-foreground">Export stickers for every serial across the whole catalog</p>
          </div>
          <Switch checked={allProducts} onCheckedChange={setAllProducts} />
        </div>

        {!allProducts && (
          <div className="space-y-2">
            <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border/60">
              {(filtered as any[]).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40 transition-colors ${selectedProductIds.includes(p.id) ? "bg-primary/5" : ""}`}
                >
                  {selectedProductIds.includes(p.id) ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="truncate">{p.name}</span>
                  {p.sku && <span className="text-[11px] text-muted-foreground font-mono ml-auto shrink-0">{p.sku}</span>}
                </button>
              ))}
            </div>
            {selectedProductIds.length > 0 && <p className="text-[11px] text-primary">{selectedProductIds.length} product(s) selected</p>}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Only remaining (not sold)</p>
            <p className="text-[11px] text-muted-foreground">Off = include sold/cancelled/returned/defective serials too</p>
          </div>
          <Switch checked={onlyAvailable} onCheckedChange={setOnlyAvailable} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={resolve} disabled={loading}>
            {loading ? "Loading…" : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function PrintStickersDialog({ codes, onClose }: { codes: string[]; onClose: () => void }) {
  const settingsFn = useServerFn(getStickerSettings);
  const listPresetsFn = useServerFn(listStickerPresets);
  const markPrintedFn = useServerFn(markSerialsPrinted);
  const qc = useQueryClient();
  const { data: activeSettings, refetch: refetchSettings } = useQuery({ queryKey: ["sticker-settings"], queryFn: () => settingsFn() });
  const { data: presets = [], refetch: refetchPresets } = useQuery<any[]>({ queryKey: ["sticker-presets", "product_serial"], queryFn: () => listPresetsFn({ data: { kind: "product_serial" } }) });
  // Fetch full rows including print_count and last_printed_at for smart filtering
  const { data: allRows = [] } = useQuery({
    queryKey: ["print-serials", codes],
    queryFn: async () =>
      (await (supabase.from as any)("product_serials")
        .select("serial_code, print_count, last_printed_at, products(name, sku, price, compare_at_price, sticker_preset_id), product_variants(size, color, sku)")
        .in("serial_code", codes)).data ?? [],
  });
  // Keep 'rows' as alias for backward compat with the rest of this function
  const rows = allRows;

  const { data: brandLogoUrl } = useQuery({
    queryKey: ["site-logo-url"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "logo_url").maybeSingle();
      if (!data) return null;
      return typeof data.value === "object" && data.value !== null ? (data.value as any).value ?? null : data.value;
    },
  });

  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"pdf" | "jpg" | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [columns, setColumns] = useState(1);

  // ── Filter & selection state ───────────────────────────────────────────────
  type FilterMode = "unprinted" | "never" | "most" | "all" | "manual";
  const [filterMode, setFilterMode] = useState<FilterMode>("never");
  const [quantity, setQuantity] = useState<number | "">(codes.length);
  const [manualSelected, setManualSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (allRows.length > 0 && (quantity === "" || quantity === codes.length)) {
      const neverCount = allRows.filter((r: any) => !r.last_printed_at && (r.print_count ?? 0) === 0).length;
      setQuantity(neverCount > 0 ? neverCount : allRows.length);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows.length]);

  const neverPrintedCount = useMemo(() => allRows.filter((r: any) => !r.last_printed_at && (r.print_count ?? 0) === 0).length, [allRows]);
  const printedOnceCount = useMemo(() => allRows.filter((r: any) => (r.print_count ?? 0) > 0).length, [allRows]);

  // ── Filtered rows based on mode + quantity cap ─────────────────────────────
  const filteredRows = useMemo(() => {
    let sorted = [...allRows] as any[];
    if (filterMode === "never") {
      sorted = sorted.filter(r => !r.last_printed_at && (r.print_count ?? 0) === 0);
    } else if (filterMode === "unprinted") {
      sorted = sorted.sort((a, b) => (a.print_count ?? 0) - (b.print_count ?? 0));
    } else if (filterMode === "most") {
      sorted = sorted.sort((a, b) => (b.print_count ?? 0) - (a.print_count ?? 0));
    } else if (filterMode === "manual") {
      sorted = sorted.filter(r => manualSelected.has(r.serial_code));
    }
    const qty = typeof quantity === "number" && quantity > 0 ? quantity : sorted.length;
    return sorted.slice(0, qty);
  }, [allRows, filterMode, quantity, manualSelected]);

  const presetsById = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of presets) m.set(p.id, p);
    return m;
  }, [presets]);

  const activePreset = useMemo(() => {
    if (selectedPresetId && presetsById.has(selectedPresetId)) {
      return presetsById.get(selectedPresetId);
    }
    const foundActive = presets.find((p: any) => p.is_active);
    return foundActive || activeSettings || { brand_name: "ORIZINO", show_size: true, show_original_price: true, currency_symbol: "৳", barcode_format: "qrcode", qr_data_mode: "url" };
  }, [selectedPresetId, presetsById, presets, activeSettings]);

  function configFor(row: any): any {
    if (selectedPresetId && presetsById.has(selectedPresetId)) {
      return presetsById.get(selectedPresetId);
    }
    const id = row.products?.sticker_preset_id;
    return (id && presetsById.get(id)) || activePreset;
  }

  const stickerItems = useMemo<StickerData[]>(() => {
    return filteredRows.map((r: any) => {
      const variantLabel = [r.product_variants?.color, r.product_variants?.size].filter(Boolean).join(" · ");
      return {
        serialCode: r.serial_code,
        brandName: configFor(r).brand_name ?? "ORIZINO",
        productName: r.products?.name ?? "Product",
        price: r.products?.price ? `৳${Number(r.products.price).toFixed(0)}` : undefined,
        compareAtPrice: r.products?.compare_at_price ? `৳${Number(r.products.compare_at_price).toFixed(0)}` : undefined,
        size: variantLabel || r.product_variants?.size || undefined,
        brandLogoUrl: brandLogoUrl ?? undefined,
        config: configFor(r),
      };
    });
  }, [filteredRows, selectedPresetId, presetsById, activePreset, brandLogoUrl]);

  const printedCodes = filteredRows.map((r: any) => r.serial_code);

  async function markPrinted() {
    try {
      await markPrintedFn({ data: { codes: printedCodes } });
      qc.invalidateQueries({ queryKey: ["serials"] });
      qc.invalidateQueries({ queryKey: ["print-serials"] });
    } catch { /* best-effort — never block the export on this */ }
  }

  async function exportPdf() {
    if (stickerItems.length === 0) return;
    setExporting("pdf");
    try {
      const blob = await stickersToPdfBlob(stickerItems);
      downloadBlob(blob, `stickers-${new Date().toISOString().slice(0, 10)}.pdf`);
      await markPrinted();
      toast({ title: `${stickerItems.length} Stickers PDF exported (Vector 300 DPI)` });
    } catch (e: any) {
      toast({ title: "PDF export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }

  async function exportJpg() {
    if (stickerItems.length === 0) return;
    setExporting("jpg");
    try {
      const blob = await stickersToJpegSheetBlob(stickerItems, { columns });
      downloadBlob(blob, `stickers-${new Date().toISOString().slice(0, 10)}.jpg`);
      await markPrinted();
      toast({ title: "Stickers JPG exported (300 DPI)" });
    } catch (e: any) {
      toast({ title: "JPG export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }

  async function doPrint() {
    await markPrinted();
    window.print();
  }

  // Filter mode options
  const filterOptions: { value: FilterMode; label: string; icon: string; desc: string }[] = [
    { value: "never", label: "Never Printed", icon: "✨", desc: `Only serials with 0 prints (${neverPrintedCount})` },
    { value: "unprinted", label: "Least Printed", icon: "📋", desc: "Lowest print count first" },
    { value: "most", label: "Most Printed", icon: "🔁", desc: "Highest print count first" },
    { value: "all", label: "All Stock", icon: "📦", desc: "All serials in order" },
    { value: "manual", label: "Manual Pick", icon: "☑️", desc: "Select specific ones" },
  ];

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-border/50 shrink-0">
            <div className="pr-6 sm:pr-0">
              <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Print Stickers
                <Badge variant="secondary" className="text-[11px] font-mono">{filteredRows.length}/{allRows.length}</Badge>
              </DialogTitle>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2">
                Single-column roll (POS) or multi-column sheet.
                <span className="text-emerald-500 font-medium">✨ {neverPrintedCount} never printed</span>
                {printedOnceCount > 0 && <span className="text-amber-500 font-medium">· 🔁 {printedOnceCount} already printed</span>}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomizeOpen(true)}
              className="gap-1.5 text-xs h-8 w-full sm:w-auto bg-background hover:bg-muted font-medium border-primary/30 text-primary"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Update Sticker Design
            </Button>
          </DialogHeader>

          {/* ── Smart Filter + Controls Bar ─────────────────────────────── */}
          <div className="space-y-2 shrink-0">
            {/* Filter mode tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0 mr-1">Filter:</span>
              {filterOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.desc}
                  onClick={() => setFilterMode(opt.value as FilterMode)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                    filterMode === opt.value
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <span>{opt.icon}</span> {opt.label}
                  {opt.value === "never" && neverPrintedCount > 0 && (
                    <span className={`text-[9px] font-mono rounded px-1 ${filterMode === "never" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-emerald-500/15 text-emerald-600"}` }>
                      {neverPrintedCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Quantity + Layout + Preset row */}
            <div className="flex flex-wrap items-center gap-2 bg-muted/30 rounded-lg border border-border/50 p-2">
              <Label className="text-xs font-semibold text-foreground whitespace-nowrap shrink-0">Qty:</Label>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, (typeof q === "number" ? q : allRows.length) - 1))} className="w-6 h-6 rounded border border-border/60 bg-background flex items-center justify-center text-xs text-muted-foreground hover:text-foreground cursor-pointer">−</button>
                <input
                  type="number" min={1} max={allRows.length} value={quantity}
                  onChange={e => { const v = parseInt(e.target.value); setQuantity(isNaN(v) ? "" : Math.min(Math.max(1, v), allRows.length)); }}
                  className="w-12 h-6 text-center text-xs font-mono rounded border border-border/60 bg-background text-foreground focus:outline-none focus:border-primary"
                />
                <button type="button" onClick={() => setQuantity(q => Math.min(allRows.length, (typeof q === "number" ? q : 1) + 1))} className="w-6 h-6 rounded border border-border/60 bg-background flex items-center justify-center text-xs text-muted-foreground hover:text-foreground cursor-pointer">+</button>
                <button type="button" onClick={() => setQuantity(filterMode === "never" ? neverPrintedCount : allRows.length)} className="text-[10px] text-primary underline underline-offset-2 cursor-pointer ml-1 hover:no-underline whitespace-nowrap">Max</button>
              </div>
              <div className="h-4 w-px bg-border/50 shrink-0" />
              <Label className="text-xs font-semibold text-foreground shrink-0">Layout:</Label>
              <div className="inline-flex rounded-md border border-input p-0.5 bg-background text-[10px]">
                {[{ v: 1, l: "1 Col" }, { v: 2, l: "2 Col" }, { v: 3, l: "3 Col" }, { v: 4, l: "4 Col" }].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setColumns(v)} className={`px-2 py-0.5 rounded transition-colors font-medium flex items-center gap-1 cursor-pointer ${ columns === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground" }`}>
                    {v === 1 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}{l}
                  </button>
                ))}
              </div>
              {presets.length > 0 && (
                <>
                  <div className="h-4 w-px bg-border/50 shrink-0" />
                  <Label className="text-[10px] text-muted-foreground shrink-0">Preset:</Label>
                  <Select value={selectedPresetId ?? presets.find((p: any) => p.is_active)?.id ?? presets[0]?.id ?? ""} onValueChange={(val) => setSelectedPresetId(val)}>
                    <SelectTrigger className="h-6 text-[10px] w-[140px] bg-background">
                      <SelectValue placeholder="Preset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((p: any) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name} {p.is_active ? "(Active)" : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* Manual Picker Panel */}
            {filterMode === "manual" && (
              <div className="border border-primary/30 rounded-xl bg-card/60 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-muted/30">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    Pick Stickers
                    <Badge variant="outline" className="text-[9px] font-mono">{manualSelected.size} selected</Badge>
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setManualSelected(new Set(allRows.map((r: any) => r.serial_code)))} className="text-[10px] text-primary underline underline-offset-2 cursor-pointer hover:no-underline">All</button>
                    <span className="text-border">·</span>
                    <button type="button" onClick={() => setManualSelected(new Set())} className="text-[10px] text-muted-foreground underline underline-offset-2 cursor-pointer hover:no-underline">None</button>
                  </div>
                </div>
                <div className="max-h-[22vh] overflow-y-auto divide-y divide-border/20">
                  {allRows.map((r: any) => {
                    const isChecked = manualSelected.has(r.serial_code);
                    const printCnt = r.print_count ?? 0;
                    const variantLabel = [r.product_variants?.color, r.product_variants?.size].filter(Boolean).join(" · ");
                    return (
                      <button
                        key={r.serial_code} type="button"
                        onClick={() => setManualSelected(prev => { const next = new Set(prev); if (next.has(r.serial_code)) next.delete(r.serial_code); else next.add(r.serial_code); return next; })}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors cursor-pointer ${ isChecked ? "bg-primary/8 hover:bg-primary/12" : "hover:bg-muted/40" }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${ isChecked ? "bg-primary border-primary" : "border-border" }`}>
                          {isChecked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-foreground truncate">{r.serial_code}</span>
                            {variantLabel && <span className="text-[9px] text-muted-foreground shrink-0">{variantLabel}</span>}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate block">{r.products?.name}</span>
                        </div>
                        <div className="shrink-0">
                          {printCnt === 0
                            ? <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">New</Badge>
                            : <Badge variant="outline" className={`text-[9px] ${printCnt >= 3 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>×{printCnt}</Badge>
                          }
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticker Preview — white background so stickers are visible in dark mode */}
          <div
            ref={sheetRef}
            className={`print-sheet bg-white border border-border/60 rounded-xl p-3 max-h-[35vh] overflow-y-auto shadow-inner ${
              columns === 1 ? "flex flex-col items-center gap-2" : "grid gap-2"
            }`}
            style={columns > 1 ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
          >
            {filteredRows.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                <span className="text-2xl block mb-1">
                  {filterMode === "never" ? "✅" : filterMode === "manual" ? "☑️" : "🔍"}
                </span>
                {filterMode === "never" ? "All stock has been printed at least once." :
                 filterMode === "manual" && manualSelected.size === 0 ? "Select stickers from the list above." :
                 "No stickers match the current filter."}
              </div>
            ) : (
              <>
                {columns === 1 && (
                  <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5 mb-1 print:hidden select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    POS Roll · {filteredRows.length} {filteredRows.length === 1 ? "sticker" : "stickers"}
                  </div>
                )}
                {filteredRows.map((r: any) => {
                  const cfg = configFor(r);
                  return (
                    <Sticker
                      key={r.serial_code}
                      data={{
                        serialCode: r.serial_code,
                        productName: r.products?.name ?? "",
                        size: r.product_variants?.size,
                        price: r.products?.price ?? 0,
                        compareAtPrice: r.products?.compare_at_price,
                        brand: cfg.brand_name,
                        brandLogoUrl: brandLogoUrl || undefined,
                        currency: cfg.currency_symbol,
                        showSize: cfg.show_size,
                        showOriginalPrice: cfg.show_original_price,
                        config: cfg,
                      }}
                    />
                  );
                })}
              </>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-border/40 shrink-0">
            <div className="text-[11px] sm:text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
              <span>Size: <strong>{activePreset?.width_in || 2}in × {activePreset?.height_in || 0.6}in</strong></span>
              <span>·</span>
              <span>Format: <strong>{activePreset?.barcode_format === "code128" ? "Barcode 128" : "QR Code (Auth URL)"}</strong></span>
              <span>·</span>
              <span className="text-primary font-medium">{filteredRows.length} stickers queued</span>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportJpg} disabled={!!exporting || !filteredRows.length} className="text-xs h-9">
                <FileImage className="w-3.5 h-3.5 mr-1" />
                {exporting === "jpg" ? "JPG…" : "Export JPG"}
              </Button>
              <Button variant="outline" size="sm" onClick={exportPdf} disabled={!!exporting || !filteredRows.length} className="text-xs h-9">
                <FileDown className="w-3.5 h-3.5 mr-1" />
                {exporting === "pdf" ? "PDF…" : "Export PDF"}
              </Button>
              <Button size="sm" onClick={doPrint} disabled={!filteredRows.length} className="col-span-2 sm:col-span-1 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print {filteredRows.length > 0 ? `(${filteredRows.length})` : ""}
              </Button>
            </div>
          </DialogFooter>
          <style>{`
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              body * {
                visibility: hidden !important;
              }
              .print-sheet, .print-sheet * {
                visibility: visible !important;
              }
              .print-sheet {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }
              .sticker-card {
                page-break-after: always !important;
                break-after: page !important;
                break-inside: avoid !important;
                margin: 0 auto !important;
              }
              @page {
                margin: 0 !important;
                size: auto;
              }
            }
          `}</style>
        </DialogContent>
      </Dialog>

      {/* Embedded Sticker Setup / Customization Modal */}
      {customizeOpen && (
        <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
          <DialogContent className="sm:max-w-5xl">
            <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  Sticker Studio &amp; Preset Designer
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update dimensions, QR code format, font sizes, and layout. Changes save to your active sticker preset.
                </p>
              </div>
            </DialogHeader>
            <div className="py-2">
              <StickerSetupTab
                kind="product_serial"
                onSaved={async (saved) => {
                  if (saved?.id) {
                    setSelectedPresetId(saved.id);
                  }
                  await Promise.all([refetchSettings(), refetchPresets()]);
                  qc.invalidateQueries({ queryKey: ["sticker-settings"] });
                  qc.invalidateQueries({ queryKey: ["sticker-presets"] });
                }}
              />
            </div>
            <DialogFooter>
              <Button onClick={async () => {
                setCustomizeOpen(false);
                await Promise.all([refetchSettings(), refetchPresets()]);
                qc.invalidateQueries({ queryKey: ["sticker-settings"] });
                qc.invalidateQueries({ queryKey: ["sticker-presets"] });
              }}>
                Done &amp; Return to Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* ---------------- Scanner ---------------- */

function ScannerAccessDenied() {
  return (
    <div className="rounded-xl border border-border p-8 text-center space-y-3 bg-card/50">
      <div className="mx-auto w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
        <LockIcon className="w-5 h-5 text-destructive" aria-hidden />
      </div>
      <h3 className="font-semibold">Scanner access restricted</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        The barcode scanner is limited to admins, moderators, and staff with Products section access. Ask an admin to grant you access under Team → Access.
      </p>
    </div>
  );
}

interface BoundOrderItem { productId: string; name: string; sku: string | null; ordered: number; scanned: number; }

function ScannerTab() {
  const { allowed, loading } = useScannerAccess();
  const audit = useScannerAudit();
  const [prefs] = useScannerPrefs();
  const lookup = useServerFn(lookupSerial);
  const scan = useServerFn(scanSerial);
  const qc = useQueryClient();
  const [active, setActive] = useState(false);
  const [current, setCurrent] = useState<any>(null);
  const [chooseAction, setChooseAction] = useState<null | "cancel" | "return" | "defective">(null);
  const [confirmSell, setConfirmSell] = useState(false);

  // ── Order-binding scan session ──
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [boundOrder, setBoundOrder] = useState<{ id: string; order_number: string; total?: number; created_at?: string } | null>(null);
  const [orderItems, setOrderItems] = useState<BoundOrderItem[]>([]);
  const [orderItemsExpanded, setOrderItemsExpanded] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const { data: confirmedOrders = [], isFetching: ordersLoading } = useQuery({
    queryKey: ["scanner-confirmed-orders", orderSearch],
    queryFn: async () => {
      let q = supabase.from("orders").select("id, order_number, total, created_at, shipping_full_name").eq("status", "confirmed").order("created_at", { ascending: false }).limit(50);
      if (orderSearch.trim()) q = q.ilike("order_number", `%${orderSearch.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
    enabled: orderPickerOpen,
  });

  async function selectOrder(order: { id: string; order_number: string; total?: number; created_at?: string }) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, product_name, quantity, products(sku)")
      .eq("order_id", order.id);
    const grouped = new Map<string, BoundOrderItem>();
    for (const it of items ?? []) {
      const pid = it.product_id as string;
      if (!pid) continue;
      const existing = grouped.get(pid);
      if (existing) existing.ordered += it.quantity ?? 1;
      else grouped.set(pid, { productId: pid, name: it.product_name, sku: (it as any).products?.sku ?? null, ordered: it.quantity ?? 1, scanned: 0 });
    }
    setBoundOrder(order);
    setOrderItems([...grouped.values()]);
    setOrderPickerOpen(false);
    setOrderItemsExpanded(false);
    setActive(true);
    toast({ title: `Order ${order.order_number} selected`, description: "Scan product barcodes to fulfill line items." });
  }

  function startScan() {
    if (boundOrder) { setActive(true); return; }
    setOrderPickerOpen(true);
  }

  function stopAndReset() {
    setActive(false);
    setBoundOrder(null);
    setOrderItems([]);
    setOrderItemsExpanded(false);
  }

  async function handleCode(code: string, ctx?: { mode?: "camera" | "hid" | "manual"; raw?: string }) {
    const mode = ctx?.mode ?? "manual";
    const raw = ctx?.raw ?? code;

    // Optional focus-input action
    if (prefs.action === "focus_input" && prefs.focusSelector) {
      try {
        const el = document.querySelector(prefs.focusSelector) as HTMLInputElement | null;
        if (el) {
          el.focus();
          if ("value" in el) {
            el.value = code;
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
          pushScan({ code, mode, status: "success", raw });
          void audit.scan(code, mode);
          return;
        }
      } catch {
        /* fall through */
      }
    }

    try {
      const row: any = await lookup({ data: { code } });
      if (!row) {
        pushScan({ code, mode, status: "rejected", reason: "unknown serial", raw });
        void audit.reject(code, mode, "unknown serial");
        toast({ title: "Unknown serial", description: code, variant: "destructive" });
        return;
      }

      // Order-binding mode
      if (boundOrder) {
        const item = orderItems.find((it) => it.productId === row.product_id);
        if (!item) {
          pushScan({ code, mode, status: "rejected", reason: "not on this order", raw });
          void audit.reject(code, mode, "not on this order");
          toast({ title: "Wrong product SKU", description: `${row.products?.sku ?? row.serial_code} isn't on order ${boundOrder.order_number}`, variant: "destructive" });
          return;
        }
        if (item.scanned >= item.ordered) {
          pushScan({ code, mode, status: "rejected", reason: "already fulfilled", raw });
          void audit.reject(code, mode, "already fulfilled");
          toast({ title: "Already fulfilled", description: `All ${item.ordered} unit(s) of "${item.name}" are already scanned`, variant: "destructive" });
          return;
        }
        if (row.status !== "available") {
          pushScan({ code, mode, status: "rejected", reason: `status is ${row.status}`, raw });
          void audit.reject(code, mode, `status is ${row.status}`);
          toast({ title: `Serial is ${row.status}`, description: code, variant: "destructive" });
          return;
        }

        try {
          await scan({ data: { code: row.serial_code, action: "sell", orderId: boundOrder.id } });
          pushScan({ code, mode, status: "success", raw });
          void audit.scan(code, mode);
          const nextItems = orderItems.map((it) => it.productId === item.productId ? { ...it, scanned: it.scanned + 1 } : it);
          setOrderItems(nextItems);
          setCurrent({ ...row, status: "sold", boundOrderNumber: boundOrder.order_number });
          qc.invalidateQueries({ queryKey: ["serials"] });
          const allDone = nextItems.every((it) => it.scanned >= it.ordered);
          if (allDone) {
            setActive(false);
            setCompleteOpen(true);
          }
        } catch (e: any) {
          toast({ title: "Could not bind serial to order", description: e.message, variant: "destructive" });
        }
        return;
      }

      // Regular lookup mode
      pushScan({ code, mode, status: "success", raw });
      void audit.scan(code, mode);
      setCurrent(row);
      if (row.status === "available") setConfirmSell(true);
      else if (row.status === "sold") setChooseAction("cancel");
      else toast({ title: `Serial is ${row.status}`, description: code });
    } catch (e: any) {
      pushScan({ code, mode, status: "rejected", reason: e?.message ?? "lookup failed", raw });
      void audit.reject(code, mode, e?.message ?? "lookup failed");
      toast({ title: "Lookup failed", description: e.message, variant: "destructive" });
    }
  }

  async function doAction(action: "sell" | "cancel" | "return" | "defective") {
    if (!current) return;
    try {
      const r: any = await scan({ data: { code: current.serial_code, action } });
      toast({ title: `Marked ${r.status}`, description: current.serial_code });
      qc.invalidateQueries({ queryKey: ["serials"] });
      setCurrent(null);
      setConfirmSell(false);
      setChooseAction(null);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  const copySerial = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      toast({ title: "Serial copied to clipboard", description: code });
    } catch {}
  };

  if (loading) return <div className="py-10 flex justify-center"><SectionLoader tone="platinum" size={48} /></div>;
  if (!allowed) return <ScannerAccessDenied />;

  const totalOrdered = orderItems.reduce((acc, it) => acc + it.ordered, 0);
  const totalScanned = orderItems.reduce((acc, it) => acc + it.scanned, 0);
  const orderProgress = totalOrdered > 0 ? Math.min(100, Math.round((totalScanned / totalOrdered) * 100)) : 0;

  const orderChecklistOverlay = boundOrder ? (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center justify-between text-white/90 text-xs font-semibold">
        <span>Order {boundOrder.order_number}</span>
        <span className="font-mono">{totalScanned}/{totalOrdered}</span>
      </div>
      {orderItems.map((it) => (
        <div key={it.productId} className="flex items-center justify-between text-[11px]">
          <span className={`truncate ${it.scanned >= it.ordered ? "text-emerald-400 font-medium" : "text-white/80"}`}>
            {it.name}{it.sku ? ` · ${it.sku}` : ""}
          </span>
          <span className={`shrink-0 ml-2 font-mono ${it.scanned >= it.ordered ? "text-emerald-400 font-bold" : "text-white/60"}`}>
            {it.scanned}/{it.ordered}
          </span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-4 min-w-0">
      {/* ── TOP HEADER / WORKSTATION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card/60 border border-border/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-foreground">Barcode Scanner Terminal</h2>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                ● Live Ready
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant camera scan, USB/Bluetooth HID wedge, and order binding.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {boundOrder ? (
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/25 rounded-xl px-2.5 py-1">
              <span className="text-xs font-semibold text-primary font-mono">{boundOrder.order_number}</span>
              <span className="text-[11px] font-mono text-muted-foreground">({totalScanned}/{totalOrdered})</span>
              <button
                type="button"
                onClick={stopAndReset}
                title="Exit Order Mode"
                className="ml-1 text-muted-foreground hover:text-destructive p-0.5 cursor-pointer rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOrderPickerOpen(true)}
              className="h-8 text-xs rounded-xl border-primary/30 text-primary hover:bg-primary/10 cursor-pointer font-semibold"
            >
              <Package className="w-3.5 h-3.5 mr-1.5" /> Fulfill an Order
            </Button>
          )}
          <ScannerSettingsButton />
        </div>
      </div>

      {/* ── ORDER FULFILLMENT COMMAND RIBBON (When bound to an order) ── */}
      {boundOrder && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Fulfilling Order {boundOrder.order_number}</span>
                  {boundOrder.total && (
                    <span className="text-[11px] font-mono text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border/50">
                      ৳{boundOrder.total}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Scan serialized items below. Matching serials will bind automatically to this order.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOrderItemsExpanded(!orderItemsExpanded)}
                className="h-8 text-xs rounded-xl cursor-pointer"
              >
                {orderItemsExpanded ? (
                  <>Hide Items <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
                ) : (
                  <>View Checklist ({orderItems.length}) <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOrderPickerOpen(true)}
                className="h-8 text-xs rounded-xl cursor-pointer"
              >
                Change Order
              </Button>
            </div>
          </div>

          {/* Progress Bar & Counter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Verification Progress</span>
              <span className={`font-bold ${totalScanned >= totalOrdered ? "text-emerald-500" : "text-primary"}`}>
                {totalScanned} of {totalOrdered} items ({orderProgress}%)
              </span>
            </div>
            <div className="w-full h-2 bg-secondary/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${orderProgress}%` }}
              />
            </div>
          </div>

          {/* Collapsible Order Items Checklist */}
          {orderItemsExpanded && (
            <div className="pt-2 border-t border-border/40 divide-y divide-border/30 max-h-48 overflow-y-auto pr-1">
              {orderItems.map((it) => {
                const isDone = it.scanned >= it.ordered;
                return (
                  <div key={it.productId} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                        {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Package className="w-2.5 h-2.5" />}
                      </div>
                      <div className="truncate">
                        <span className={`font-medium ${isDone ? "text-emerald-500 font-semibold" : "text-foreground"}`}>
                          {it.name}
                        </span>
                        {it.sku && <span className="text-muted-foreground font-mono text-[10px] ml-1.5">SKU: {it.sku}</span>}
                      </div>
                    </div>
                    <span className={`font-mono text-xs shrink-0 font-semibold ${isDone ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {it.scanned}/{it.ordered}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PRIMARY WORKSTATION (SYMMETRICAL 2-COLUMN GRID) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-w-0">
        {/* Pane 1 (Left): Terminal Viewfinder & Camera */}
        <div className="flex flex-col h-full rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden p-4 sm:p-5 space-y-4 min-w-0">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Terminal Viewfinder
              </h3>
              <Badge variant="outline" className="text-[9px] font-mono">
                {active ? "Camera Active" : "Standby"}
              </Badge>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <BarcodeScanner
              active={active}
              onToggle={() => (active ? stopAndReset() : startScan())}
              onScan={(c, ctx) => handleCode(c, ctx)}
              overlayContent={orderChecklistOverlay}
            />
          </div>
        </div>

        {/* Pane 2 (Right): Live Inspection & Inventory Action Hub */}
        <div className="flex flex-col h-full rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden p-4 sm:p-5 space-y-4 min-w-0">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Inspection &amp; Action Hub
              </h3>
              {current && (
                <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
                  Active Item
                </Badge>
              )}
            </div>
            {current && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setCurrent(null); setConfirmSell(false); setChooseAction(null); }}
                className="h-7 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-2"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center min-w-0">
            {current ? (
              <div className="space-y-4 min-w-0">
                {/* Product details Card */}
                <div className="p-4 rounded-xl bg-secondary/40 border border-border/50 space-y-3 min-w-0">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Scanned Product</span>
                    <h4 className="text-sm sm:text-base font-bold text-foreground leading-snug break-words">
                      {current.products?.name || "Unnamed Product"}
                    </h4>
                    {current.products?.sku && (
                      <span className="inline-block mt-1 text-[11px] font-mono text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border/50">
                        SKU: {current.products.sku}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/40 text-xs min-w-0">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">Serial Code</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-foreground break-all text-xs sm:text-sm">
                          {current.serial_code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copySerial(current.serial_code)}
                          title="Copy Serial Code"
                          className="text-muted-foreground hover:text-foreground p-1 cursor-pointer rounded shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">Current Status</span>
                      <Badge className={`mt-0.5 text-[10px] capitalize ${STATUS_COLORS[current.status] || "bg-secondary text-foreground"}`}>
                        {current.status}
                      </Badge>
                    </div>
                  </div>

                  {current.boundOrderNumber && (
                    <div className="pt-2 border-t border-border/40 text-xs">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-500 block">Bound to Order</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{current.boundOrderNumber}</span>
                    </div>
                  )}
                </div>

                {/* Quick Action Matrix */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">Execute Quick Action</span>
                  {current.status === "available" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        onClick={() => doAction("sell")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-xl sm:col-span-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark as Sold
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => doAction("defective")}
                        className="text-xs h-8 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                      >
                        Mark Defective
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => doAction("cancel")}
                        className="text-xs h-8 rounded-xl cursor-pointer"
                      >
                        Cancel Serial
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => doAction("return")}
                        className="text-xs h-9 rounded-xl border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer font-semibold"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Return to Stock
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => doAction("defective")}
                        className="text-xs h-9 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                      >
                        Mark Defective
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-3 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center mx-auto text-muted-foreground">
                  <ScanLine className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-foreground">Waiting for Scan Input</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
                    Point your camera or trigger your handheld physical scanner to inspect items and execute rapid inventory updates.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECONDARY WORKSPACE SECTION (TABS: HISTORY / TERMINAL / SETUP GUIDE) ── */}
      <div className="rounded-2xl border border-border/70 p-4 sm:p-5 bg-card/60 backdrop-blur-md space-y-4">
        <Tabs defaultValue="history" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
            <TabsList className="bg-secondary/40 p-1 rounded-xl h-auto flex-wrap">
              <TabsTrigger value="history" className="rounded-lg text-xs py-1.5 px-3">
                <History className="w-3.5 h-3.5 mr-1.5" /> Scan History
              </TabsTrigger>
              <TabsTrigger value="terminal" className="rounded-lg text-xs py-1.5 px-3">
                <TerminalSquare className="w-3.5 h-3.5 mr-1.5" /> Raw Terminal
              </TabsTrigger>
              <TabsTrigger value="setup" className="rounded-lg text-xs py-1.5 px-3">
                <Keyboard className="w-3.5 h-3.5 mr-1.5" /> Hardware Guide
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="history" className="pt-3 m-0">
            <ScannerHistoryPanel />
          </TabsContent>

          <TabsContent value="terminal" className="pt-3 m-0">
            <ScannerTestPanel />
          </TabsContent>

          <TabsContent value="setup" className="pt-3 m-0">
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-foreground">Zero-Driver Keyboard-Wedge Protocol</h4>
                  <p className="text-muted-foreground">
                    Any standard USB or Bluetooth scanner in HID mode (Zebra, Honeywell, Symcode, Netum, Eyoyo, Tera) transmits data automatically across this panel.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 text-xs">
                <div className="p-3.5 rounded-xl bg-card border border-border/50 space-y-2">
                  <span className="font-bold text-foreground block">Quick Setup Steps</span>
                  <ol className="list-decimal ml-4 space-y-1 text-muted-foreground">
                    <li>Connect your scanner via USB cable or Bluetooth keyboard pairing.</li>
                    <li>Scan your scanner's manual barcode to ensure <b>“Add Enter Suffix”</b> is active.</li>
                    <li>Verify standard <b>Code128</b> or <b>QR</b> symbologies are enabled.</li>
                    <li>With this page open, scan barcodes immediately without clicking any input box.</li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border/50 space-y-2">
                  <span className="font-bold text-foreground block">Tips &amp; Troubleshooting</span>
                  <ul className="list-disc ml-4 space-y-1 text-muted-foreground">
                    <li>Scanner inputs arriving under 50ms are captured globally regardless of focus.</li>
                    <li>Use <b>Continuous Mode</b> for high-volume rapid fulfillment without stopping.</li>
                    <li>Adjust minimum barcode length and debounce timings in <b>Scanner Settings</b>.</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── DIALOG: CONFIRM MARK AS SOLD ── */}
      <Dialog open={confirmSell} onOpenChange={setConfirmSell}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Mark as sold?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs sm:text-sm space-y-1">
            <p className="text-muted-foreground">Confirm that this serial unit has been sold:</p>
            <p className="font-semibold text-foreground">
              Serial <b className="font-mono text-primary font-bold">{current?.serial_code}</b>
            </p>
            <p className="text-muted-foreground">{current?.products?.name}</p>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmSell(false)} className="h-8 text-xs rounded-xl">
              Cancel
            </Button>
            <Button size="sm" onClick={() => doAction("sell")} className="h-8 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              Confirm Sold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: UPDATE SOLD SERIAL STATUS ── */}
      <Dialog open={chooseAction !== null} onOpenChange={(o) => !o && setChooseAction(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Update Sold Serial</DialogTitle>
          </DialogHeader>
          <p className="text-xs sm:text-sm text-muted-foreground -mt-1">
            <b className="font-mono text-foreground">{current?.serial_code}</b> is currently sold. Choose status:
          </p>
          <div className="space-y-2 py-1">
            {(["return", "cancel", "defective"] as const).map((a) => (
              <label
                key={a}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                  chooseAction === a ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/40"
                }`}
              >
                <input
                  type="radio"
                  name="choose_action_status"
                  checked={chooseAction === a}
                  onChange={() => setChooseAction(a)}
                  className="scale-110"
                />
                <div className="text-xs">
                  <span className="font-semibold capitalize text-foreground block">
                    {a === "return" ? "Return to Stock" : a === "cancel" ? "Cancel Sale" : "Mark as Defective"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {a === "defective" ? "Removes unit from active inventory" : "Returns unit to available stock"}
                  </span>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setChooseAction(null)} className="h-8 text-xs rounded-xl">
              Cancel
            </Button>
            <Button size="sm" onClick={() => chooseAction && doAction(chooseAction)} className="h-8 text-xs font-semibold rounded-xl">
              Apply Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: ORDER PICKER (FULFILL AN ORDER) ── */}
      <Dialog open={orderPickerOpen} onOpenChange={setOrderPickerOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg p-4 sm:p-6 max-h-[88vh] flex flex-col rounded-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Select Order to Fulfill</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            Scans will be matched against this order's items and bound automatically once verified.
          </p>

          <div className="relative my-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Search by order number or customer…"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/50 max-h-[45vh]">
            {ordersLoading ? (
              <div className="p-8 flex justify-center"><SectionLoader tone="platinum" size={32} /></div>
            ) : confirmedOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No confirmed orders awaiting fulfillment.
              </div>
            ) : (
              confirmedOrders.map((o: any) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => selectOrder(o)}
                  className="w-full flex items-center justify-between p-3 text-left text-xs hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-mono font-bold text-foreground block">{o.order_number}</span>
                    {o.shipping_full_name && (
                      <span className="text-[11px] text-muted-foreground truncate block">{o.shipping_full_name}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">৳{o.total}</span>
                    <span className="text-[10px] text-primary hover:underline">Select &rarr;</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setOrderPickerOpen(false); setActive(true); }}
              className="h-8 text-xs rounded-xl"
            >
              Scan without Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOrderPickerOpen(false)}
              className="h-8 text-xs rounded-xl"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: ORDER SCAN COMPLETE CELEBRATION ── */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm p-5 sm:p-6 text-center rounded-2xl">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-2">
            <CheckCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center text-base sm:text-lg">Order Fully Verified!</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            All serialized items for order <span className="font-mono font-bold text-foreground">{boundOrder?.order_number}</span> have been scanned and bound.
          </p>
          <DialogFooter className="flex justify-center pt-2">
            <Button
              size="sm"
              onClick={() => { setCompleteOpen(false); stopAndReset(); }}
              className="w-full h-8 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Complete &amp; Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Sticker Setup Studio ---------------- */

export function StickerSetupTab({
  kind = "product_serial",
  onSaved,
}: {
  kind?: "product_serial" | "order";
  onSaved?: (preset: any) => void;
} = {}) {
  const listFn = useServerFn(listStickerPresets);
  const updateFn = useServerFn(updateStickerSettings);
  const createFn = useServerFn(createStickerPreset);
  const activateFn = useServerFn(activateStickerPreset);
  const deleteFn = useServerFn(deleteStickerPreset);
  const duplicateFn = useServerFn(duplicateStickerPreset);
  const importFn = useServerFn(importStickerPresets);
  const qc = useQueryClient();

  const { data: presets = [], isLoading: presetsLoading } = useQuery<any[]>({
    queryKey: ["sticker-presets", kind],
    queryFn: () => listFn({ data: { kind } }),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(null);
  const [locked, setLocked] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("geometry");
  const [previewScale, setPreviewScale] = useState<1 | 1.5 | 2>(1);
  const [previewMode, setPreviewMode] = useState<"product" | "order" | "custom">(kind === "order" ? "order" : "product");
  const [customSerialText, setCustomSerialText] = useState("ORZ-KENK0001W-0042");

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [sampleOpen, setSampleOpen] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "jpg" | null>(null);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);

  const sampleRef = useRef<HTMLDivElement>(null);
  const livePreviewRef = useRef<HTMLDivElement>(null);
  // stickerExportRef points to the raw (un-scaled) Sticker element so that
  // exportSingleJpg captures exactly what's printed — no CSS scale transform.
  const stickerExportRef = useRef<HTMLDivElement>(null);

  const activeId = presets.find((p: any) => p.is_active)?.id ?? presets[0]?.id ?? null;
  const currentId = selectedId ?? activeId;

  const current = presets.find((p: any) => p.id === currentId) ?? {};
  const s = form ?? current;
  const editLocked = locked && currentId === activeId && !form;
  const isDirty = form !== null;

  function set(k: string, v: any) {
    setForm({ ...(form ?? current), [k]: v });
  }

  const num = (k: string, def: number) => (s[k] ?? def);
  const setNum = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, e.target.value === "" ? null : Number(e.target.value));

  /**
   * setDimension — smart dimension setter that proportionally rescales
   * dependent layout values (padding, barcode height, font sizes) so the
   * content never overflows when the user changes width_in or height_in.
   *
   * Ratios are preserved relative to the OLD dimension so the visual
   * balance is maintained automatically.
   */
  function setDimension(key: "width_in" | "height_in", rawValue: string) {
    const newVal = rawValue === "" ? null : Number(rawValue);
    if (newVal === null || isNaN(newVal)) { set(key, newVal); return; }
    const base = form ?? current;
    const oldVal: number = base[key] ?? (key === "width_in" ? 2 : 0.6);
    if (oldVal === 0) { set(key, newVal); return; }
    const ratio = newVal / oldVal;

    if (key === "width_in") {
      // Scale horizontal padding proportionally
      const padX = Math.round((base.padding_x_in ?? 0.05) * ratio * 1000) / 1000;
      setForm({ ...base, width_in: newVal, padding_x_in: padX });
    } else {
      // Scale vertical padding, barcode height, and font sizes proportionally
      const padY   = Math.round((base.padding_y_in ?? 0.04) * ratio * 1000) / 1000;
      const barH   = Math.round((base.barcode_height_in ?? 0.45) * ratio * 100) / 100;
      const hdrPt  = Math.round((base.header_font_size_pt ?? 6.5) * ratio * 10) / 10;
      const ftrPt  = Math.round((base.footer_font_size_pt ?? 5.5) * ratio * 10) / 10;
      const pnPt   = Math.round((base.product_name_font_size_pt ?? 5.5) * ratio * 10) / 10;
      setForm({
        ...base,
        height_in: newVal,
        padding_y_in: padY,
        barcode_height_in: barH,
        header_font_size_pt: hdrPt,
        footer_font_size_pt: ftrPt,
        product_name_font_size_pt: pnPt,
      });
    }
    setLocked(false);
  }

  const save = useMutation({
    mutationFn: () => updateFn({ data: { ...(form ?? current), id: currentId } }),
    onSuccess: (savedRow: any) => {
      toast({ title: "Preset settings saved successfully" });
      qc.invalidateQueries({ queryKey: ["sticker-presets"] });
      qc.invalidateQueries({ queryKey: ["sticker-settings"] });
      setForm(null);
      onSaved?.(savedRow || { ...(form ?? current), id: currentId });
    },
    onError: (e: any) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: async (name: string) => {
      if (!name.trim()) return null;
      return createFn({ data: { name: name.trim(), copy_from_id: currentId ?? null, kind } });
    },
    onSuccess: (row: any) => {
      if (!row) return;
      qc.invalidateQueries({ queryKey: ["sticker-presets"] });
      qc.invalidateQueries({ queryKey: ["sticker-settings"] });
      setSelectedId(row.id);
      setForm(null);
      setLocked(false);
      setCreateOpen(false);
      setNewPresetName("");
      toast({ title: `Preset "${row.name}" created` });
      onSaved?.(row);
    },
    onError: (e: any) =>
      toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const activateMut = useMutation({
    mutationFn: () => activateFn({ data: { id: currentId! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sticker-presets"] });
      qc.invalidateQueries({ queryKey: ["sticker-settings"] });
      toast({ title: "Preset set as active" });
      onSaved?.({ id: currentId, is_active: true });
    },
    onError: (e: any) =>
      toast({ title: "Activate failed", description: e.message, variant: "destructive" }),
  });

  const duplicateMut = useMutation({
    mutationFn: () => duplicateFn({ data: { id: currentId! } }),
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["sticker-presets", kind] });
      if (row?.id) setSelectedId(row.id);
      setForm(null);
      setLocked(false);
      toast({ title: "Preset duplicated" });
    },
    onError: (e: any) =>
      toast({ title: "Duplicate failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: currentId! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sticker-presets", kind] });
      setSelectedId(null);
      setForm(null);
      toast({ title: "Preset deleted" });
    },
    onError: (e: any) =>
      toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const importMut = useMutation({
    mutationFn: (presetList: any[]) => importFn({ data: { presets: presetList } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["sticker-presets", kind] });
      setImportOpen(false);
      setImportText("");
      toast({ title: `Imported ${res?.created ?? 0} preset(s)` });
    },
    onError: (e: any) =>
      toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  function parseAndImport(text: string) {
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      if (!arr.length) throw new Error("No presets found in JSON");
      importMut.mutate(arr);
    } catch (e: any) {
      toast({ title: "Invalid JSON format", description: e.message, variant: "destructive" });
    }
  }

  function exportPreset(all: boolean) {
    const payload = all ? presets : [current];
    const clean = payload.map((p: any) => {
      const c = { ...p };
      delete c.id;
      delete c.created_at;
      delete c.updated_at;
      delete c.is_active;
      return c;
    });
    const json = JSON.stringify(all ? clean : clean[0], null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const name = all
      ? "sticker-presets.json"
      : `sticker-preset-${(current?.name ?? "preset").replace(/\s+/g, "-")}.json`;
    downloadBlob(blob, name);
  }

  async function copyExportToClipboard() {
    const clean = { ...current };
    delete clean.id;
    delete clean.created_at;
    delete clean.updated_at;
    delete clean.is_active;
    await navigator.clipboard.writeText(JSON.stringify(clean, null, 2));
    toast({ title: "Copied preset JSON to clipboard" });
  }

  const { data: brandLogoUrl } = useQuery({
    queryKey: ["site-logo-url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "logo_url")
        .maybeSingle();
      if (!data) return null;
      return typeof data.value === "object" && data.value !== null
        ? (data.value as any).value ?? null
        : data.value;
    },
  });

  const preview = useMemo(() => {
    let serial = `${s.serial_prefix ?? "ORZ"}-SAMPLE-000123`;
    let productName = "Gachiakuta Oversized Heavyweight Tee";
    let size = "L";
    let price = 1250;
    let compareAtPrice = 1450;

    if (previewMode === "order") {
      serial = "ORD-2026-08492";
      productName = "Fulfillment Order (2 items)";
      size = "COD: ৳2,450";
      price = 2450;
      compareAtPrice = null;
    } else if (previewMode === "custom") {
      serial = customSerialText.trim() || `${s.serial_prefix ?? "ORZ"}-TEST-0001`;
      productName = "Custom Test Product";
    }

    return {
      serialCode: serial,
      productName,
      size,
      price,
      compareAtPrice,
      brand: s.brand_name ?? "ORIZINO",
      brandLogoUrl: brandLogoUrl || undefined,
      currency: s.currency_symbol ?? "৳",
      showSize: s.show_size ?? true,
      showOriginalPrice: s.show_original_price ?? true,
      config: s,
    };
  }, [s, brandLogoUrl, previewMode, customSerialText]);

  const warnings = useMemo(() => validateStickerConfig(s ?? {}), [s]);
  const hasErrors = warnings.some((w) => w.level === "error");

  const sampleCount = 12;
  const sampleItems = useMemo(
    () =>
      Array.from({ length: sampleCount }, (_, i) => ({
        ...preview,
        serialCode: `${s.serial_prefix ?? "ORZ"}-SAMPLE-${String(i + 1).padStart(4, "0")}`,
      })),
    [preview, s.serial_prefix],
  );

  async function exportSamplePdf() {
    setExporting("pdf");
    try {
      const blob = await stickersToPdfBlob(sampleItems);
      downloadBlob(blob, `sticker-preset-${(s.name ?? "sample").replace(/\s+/g, "-")}.pdf`);
      toast({ title: "Sample PDF exported (Vector 300 DPI)" });
    } catch (e: any) {
      toast({ title: "PDF export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }

  async function exportSingleJpg() {
    setExporting("jpg");
    try {
      const blob = await stickerDataToJpegBlob(preview);
      downloadBlob(blob, `sticker-preview-${(s.name ?? "preview").replace(/\s+/g, "-")}.jpg`);
      toast({ title: "Preview JPG exported (300 DPI)" });
    } catch (e: any) {
      toast({ title: "JPG export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }

  const applySizePreset = (w: number, h: number, padX: number, padY: number, format?: string) => {
    setForm({
      ...(form ?? current),
      width_in: w,
      height_in: h,
      padding_x_in: padX,
      padding_y_in: padY,
      ...(format ? { barcode_format: format } : {}),
    });
    setLocked(false);
  };

  return (
    <div className="space-y-5">
      {/* ================= 1. EXECUTIVE PRESET COMMAND BAR ================= */}
      <div className="bg-card/90 backdrop-blur-md rounded-2xl border border-border/70 p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        {/* Preset Selector & Identity */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={currentId ?? undefined}
                onValueChange={(v) => {
                  setSelectedId(v);
                  setForm(null);
                  setLocked(true);
                }}
              >
                <SelectTrigger className="h-9 font-semibold text-xs sm:text-sm bg-background border-border/80 min-w-[200px] max-w-[280px]">
                  <SelectValue placeholder="Select preset…" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {presets.map((p: any) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="font-semibold">{p.name}</span>
                        {p.is_active && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/30">
                            Active
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentId === activeId ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-medium gap-1 shrink-0">
                  <CheckCheck className="w-3 h-3" />
                  Active Default
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[11px] shrink-0">
                  Draft Preset
                </Badge>
              )}

              <Badge variant="secondary" className="text-[11px] font-mono text-muted-foreground hidden sm:inline-flex">
                {num("width_in", 2)}" × {num("height_in", 0.6)}"
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Controls & Save Trigger */}
        <div className="flex items-center justify-end gap-2 shrink-0 flex-wrap">
          {/* Preset Management Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 bg-background hover:bg-muted font-medium border-border/80">
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Preset Actions</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Preset Options
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer font-medium">
                <Plus className="w-4 h-4 text-primary" />
                <span>Create New Preset</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => duplicateMut.mutate()}
                disabled={!currentId || duplicateMut.isPending}
                className="gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
                <span>Duplicate Preset</span>
              </DropdownMenuItem>
              {currentId !== activeId && (
                <DropdownMenuItem
                  onClick={() => activateMut.mutate()}
                  disabled={!currentId || activateMut.isPending}
                  className="gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Set as Active Preset</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportPreset(false)} disabled={!currentId} className="gap-2 cursor-pointer">
                <Download className="w-4 h-4 text-muted-foreground" />
                <span>Export Preset (JSON)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPreset(true)} disabled={!presets.length} className="gap-2 cursor-pointer">
                <Download className="w-4 h-4 text-muted-foreground" />
                <span>Export All Presets</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyExportToClipboard} disabled={!currentId} className="gap-2 cursor-pointer">
                <Copy className="w-4 h-4 text-muted-foreground" />
                <span>Copy JSON Config</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportOpen(true)} className="gap-2 cursor-pointer">
                <FileUp className="w-4 h-4 text-primary" />
                <span>Import from JSON…</span>
              </DropdownMenuItem>
              {presets.length > 1 && currentId !== activeId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (window.confirm(`Permanently delete preset "${current?.name}"?`)) {
                        deleteMut.mutate();
                      }
                    }}
                    disabled={deleteMut.isPending}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Preset</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Edit Protection Lock Toggle */}
          {currentId === activeId && (
            <Button
              size="sm"
              variant={editLocked ? "outline" : "secondary"}
              onClick={() => setLocked(!locked)}
              className={`h-9 text-xs gap-1.5 font-medium transition-colors ${
                editLocked ? "text-muted-foreground" : "bg-primary/10 text-primary border-primary/30"
              }`}
            >
              {editLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Unlocked</span>
                </>
              )}
            </Button>
          )}

          {/* Discard Changes Button */}
          {isDirty && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setForm(null)}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Discard
            </Button>
          )}

          {/* Save Configuration Button */}
          <Button
            size="sm"
            onClick={() => save.mutate()}
            disabled={!isDirty || save.isPending || hasErrors || editLocked}
            className={`h-9 px-4 text-xs font-semibold shadow-xs transition-all ${
              isDirty
                ? "bg-primary hover:bg-primary/90 text-primary-foreground animate-pulse"
                : "bg-muted text-muted-foreground hover:bg-muted"
            }`}
          >
            {save.isPending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : isDirty ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Save Changes
              </>
            ) : (
              "All Saved"
            )}
          </Button>
        </div>
      </div>

      {/* ================= 2. TWO-COLUMN INTERACTIVE STUDIO ================= */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: LIVE PHYSICAL LABEL STAGE & PRODUCTION TOOLS */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
          {/* Visual Canvas Card */}
          <div className="bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col">
            {/* Canvas Header Bar */}
            <div className="px-4 py-3 border-b border-border/60 bg-muted/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-foreground tracking-tight">Live Thermal Preview</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Scale buttons */}
                {([1, 1.5, 2] as const).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setPreviewScale(sc)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                      previewScale === sc
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {sc}x
                  </button>
                ))}
              </div>
            </div>

            {/* Stage Canvas Area with Realistic Backdrop */}
            <div className="p-6 sm:p-8 bg-gradient-to-b from-muted/60 via-muted/30 to-background flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
              {/* Grid Background Pattern */}
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              />

              {/* Physical Dimension Caliper Tags */}
              <div className="mb-3 flex items-center gap-2 text-[11px] font-mono text-muted-foreground/80 bg-background/80 px-2.5 py-0.5 rounded-full border border-border/50 shadow-2xs">
                <span>{num("width_in", 2).toFixed(2)}" W</span>
                <span>×</span>
                <span>{num("height_in", 0.6).toFixed(2)}" H</span>
                <span>·</span>
                <span>{s.barcode_format === "qrcode" ? "QR Authenticated" : (s.barcode_format || "1D").toUpperCase()}</span>
              </div>

              {/* Rendered Physical Sticker in Live Preview */}
              <div
                ref={livePreviewRef}
                style={{ transform: `scale(${previewScale})`, transformOrigin: "center center" }}
                className="transition-transform duration-200 ease-out"
              >
                <div key={currentId ?? "none"} className="transition-all duration-300 ease-out animate-in fade-in zoom-in-95">
                  <Sticker data={preview} />
                </div>
              </div>

              {/* Isolated unscaled staging target for 1:1 pixel-perfect JPG export */}
              <div
                ref={stickerExportRef}
                aria-hidden="true"
                style={{
                  position: "fixed",
                  left: "-99999px",
                  top: 0,
                  pointerEvents: "none",
                  zIndex: -9999,
                  opacity: 1,
                  transform: "none",
                  animation: "none",
                }}
              >
                <Sticker data={preview} />
              </div>
            </div>

            {/* Stage Footer & Sample Selector */}
            <div className="p-3 bg-muted/20 border-t border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-medium">Sample:</span>
                <div className="inline-flex rounded-lg border border-border/70 p-0.5 bg-background">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("product")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      previewMode === "product" ? "bg-primary text-primary-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("order")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      previewMode === "order" ? "bg-primary text-primary-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("custom")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      previewMode === "custom" ? "bg-primary text-primary-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {previewMode === "custom" && (
                <Input
                  value={customSerialText}
                  onChange={(e) => setCustomSerialText(e.target.value)}
                  placeholder="Custom code…"
                  className="h-7 text-xs font-mono bg-background sm:w-36"
                />
              )}
            </div>
          </div>

          {/* Live Diagnostic & Sanity Checks */}
          <div className={`rounded-2xl border p-4 shadow-2xs transition-all ${
            hasErrors ? "bg-destructive/5 border-destructive/30" : warnings.length > 0 ? "bg-amber-500/5 border-amber-500/30" : "bg-card border-border/70"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-4 h-4 ${hasErrors ? "text-destructive" : warnings.length > 0 ? "text-amber-500" : "text-emerald-500"}`} />
                <span className="text-xs font-bold text-foreground">Printability &amp; Scan Quality</span>
              </div>
              <Badge variant={hasErrors ? "destructive" : warnings.length > 0 ? "outline" : "secondary"} className="text-[10px] px-2">
                {hasErrors ? "Layout Error" : warnings.length > 0 ? `${warnings.length} Advisory Notes` : "100% Verified"}
              </Badge>
            </div>

            {warnings.length > 0 ? (
              <ul className="mt-2.5 space-y-1.5 text-xs">
                {warnings.map((w, i) => (
                  <li key={i} className={`flex items-start gap-1.5 leading-snug ${w.level === "error" ? "text-destructive font-medium" : "text-amber-600 dark:text-amber-400"}`}>
                    <span className="mt-0.5">•</span>
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                Dimensions, DPI scaling, and contrast ratio are optimal for retail thermal roll printers (TSC, Xprinter, Zebra, Brother).
              </p>
            )}
          </div>

          {/* Quick Production Print & Export Strip */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSampleOpen(true)}
              className="h-9 text-xs font-medium bg-card hover:bg-muted border-border/80 gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span>Test Sheet</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportSamplePdf}
              disabled={exporting !== null}
              className="h-9 text-xs font-medium bg-card hover:bg-muted border-border/80 gap-1.5"
            >
              {exporting === "pdf" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 text-primary" />}
              <span>Export PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportSingleJpg}
              disabled={exporting !== null}
              className="h-9 text-xs font-medium bg-card hover:bg-muted border-border/80 gap-1.5"
            >
              {exporting === "jpg" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileImage className="w-3.5 h-3.5 text-primary" />}
              <span>Export JPG</span>
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: CATEGORIZED STUDIO PANELS (INDEPENDENT SCROLL) */}
        <div className="lg:col-span-7 space-y-4 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto sticker-studio-right-col">
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
            {/* Category Segmented Selector — Sticky at top of scroll container */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-0.5 pb-2.5">
              <TabsList className="w-full grid grid-cols-4 p-1 rounded-xl bg-muted/70 border border-border/60 h-10 shadow-2xs">
                <TabsTrigger value="geometry" className="text-xs font-semibold gap-1.5 py-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="truncate">Geometry</span>
                </TabsTrigger>
                <TabsTrigger value="barcode" className="text-xs font-semibold gap-1.5 py-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="truncate">Barcode &amp; QR</span>
                </TabsTrigger>
                <TabsTrigger value="branding" className="text-xs font-semibold gap-1.5 py-1.5">
                  <Type className="w-3.5 h-3.5" />
                  <span className="truncate">Branding</span>
                </TabsTrigger>
                <TabsTrigger value="fields" className="text-xs font-semibold gap-1.5 py-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="truncate">Fields &amp; Sync</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <fieldset disabled={editLocked} className={`mt-2 space-y-4 transition-opacity duration-200 ${editLocked ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
              {/* ================= PANEL 1: GEOMETRY & SIZING ================= */}
              <TabsContent value="geometry" className="space-y-4 mt-0">
                {/* Quick Physical Presets */}
                <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Standard Label Size Presets</Label>
                    <span className="text-[11px] text-muted-foreground">Click to apply standard paper specs</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { name: "2.0\" × 0.6\"", sub: "POS Roll (Standard)", w: 2, h: 0.6, px: 0.05, py: 0.04, fmt: "qrcode" },
                      { name: "2.0\" × 1.0\"", sub: "Retail Garment Tag", w: 2, h: 1.0, px: 0.06, py: 0.05, fmt: "qrcode" },
                      { name: "3.0\" × 1.0\"", sub: "Wide Jewelry / Box", w: 3, h: 1.0, px: 0.08, py: 0.06, fmt: "code128" },
                      { name: "4.0\" × 2.0\"", sub: "Shipping / Parcel", w: 4, h: 2.0, px: 0.1, py: 0.08, fmt: "qrcode" },
                    ].map((preset) => {
                      const isMatch = num("width_in", 2) === preset.w && num("height_in", 0.6) === preset.h;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applySizePreset(preset.w, preset.h, preset.px, preset.py, preset.fmt)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isMatch
                              ? "bg-primary/10 border-primary text-primary font-semibold shadow-2xs"
                              : "bg-muted/30 border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <p className="text-xs font-bold font-mono">{preset.name}</p>
                          <p className="text-[10px] truncate mt-0.5 opacity-80">{preset.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Physical Dimensions Grid */}
                <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Canvas Dimensions &amp; Margins</Label>
                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Auto-scales content on change</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Width (inches)</Label>
                      <Input
                        type="number" step="0.05" min="0.5" max="8"
                        value={num("width_in", 2)}
                        onChange={(e) => setDimension("width_in", e.target.value)}
                        className="h-9 text-xs font-mono font-semibold bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Height (inches)</Label>
                      <Input
                        type="number" step="0.05" min="0.25" max="8"
                        value={num("height_in", 0.6)}
                        onChange={(e) => setDimension("height_in", e.target.value)}
                        className="h-9 text-xs font-mono font-semibold bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Padding X (in)</Label>
                      <Input type="number" step="0.005" min="0" max="1" value={num("padding_x_in", 0.05)} onChange={setNum("padding_x_in")} className="h-9 text-xs font-mono bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Padding Y (in)</Label>
                      <Input type="number" step="0.005" min="0" max="1" value={num("padding_y_in", 0.04)} onChange={setNum("padding_y_in")} className="h-9 text-xs font-mono bg-background" />
                    </div>
                  </div>

                  {/* Border / Frame Controls */}
                  <div className="pt-3 border-t border-border/50 space-y-3">
                    <Label className="text-[11px] font-semibold text-foreground">Border / Frame</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Border Style */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Frame Style</Label>
                        <Select value={s.border_style ?? "solid"} onValueChange={(v) => set("border_style", v)}>
                          <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs">None (No Frame)</SelectItem>
                            <SelectItem value="solid" className="text-xs">Solid</SelectItem>
                            <SelectItem value="dashed" className="text-xs">Dashed</SelectItem>
                            <SelectItem value="dotted" className="text-xs">Dotted</SelectItem>
                            <SelectItem value="double" className="text-xs">Double</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Border Thickness */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Thickness (pt)</Label>
                        <Input
                          type="number" step="0.25" min="0" max="12"
                          value={num("border_width_pt", 1)}
                          onChange={setNum("border_width_pt")}
                          className="h-9 text-xs font-mono bg-background"
                          disabled={s.border_style === "none"}
                        />
                      </div>

                      {/* Corner Radius */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Corner Radius (pt)</Label>
                        <Input
                          type="number" step="1" min="0" max="72"
                          value={num("border_radius_pt", 0)}
                          onChange={setNum("border_radius_pt")}
                          className="h-9 text-xs font-mono bg-background"
                          disabled={s.border_style === "none"}
                        />
                      </div>

                      {/* Border Colour */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Frame Color</Label>
                        <div className={`flex items-center gap-2 h-9 px-2 rounded-lg border border-input bg-background ${s.border_style === "none" ? "opacity-50 pointer-events-none" : ""}`}>
                          <input type="color" value={s.border_color ?? "#000000"} onChange={(e) => set("border_color", e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
                          <span className="font-mono text-[11px] text-muted-foreground uppercase">{s.border_color ?? "#000000"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Radius visual hint */}
                    {(s.border_radius_pt ?? 0) > 0 && s.border_style !== "none" && (
                      <p className="text-[10px] text-muted-foreground">
                        Rounded corners at <strong>{num("border_radius_pt", 0)}pt</strong> ≈ {((num("border_radius_pt", 0) / 72) * 25.4).toFixed(1)} mm — clamped to half the shorter side in export.
                      </p>
                    )}
                  </div>

                  {/* Colours */}
                  <div className="pt-3 border-t border-border/50 space-y-2">
                    <Label className="text-[11px] font-semibold text-foreground">Fill &amp; Text Colours</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Background</Label>
                        <div className="flex items-center gap-2 h-9 px-2 rounded-lg border border-input bg-background">
                          <input type="color" value={s.background_color ?? "#FFFFFF"} onChange={(e) => set("background_color", e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
                          <span className="font-mono text-[11px] text-muted-foreground uppercase">{s.background_color ?? "#FFFFFF"}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Text Color</Label>
                        <div className="flex items-center gap-2 h-9 px-2 rounded-lg border border-input bg-background">
                          <input type="color" value={s.text_color ?? "#000000"} onChange={(e) => set("text_color", e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
                          <span className="font-mono text-[11px] text-muted-foreground uppercase">{s.text_color ?? "#000000"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ================= PANEL 2: BARCODE & QR ENGINE ================= */}
              <TabsContent value="barcode" className="space-y-4 mt-0">
                <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-4 shadow-2xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Barcode / 2D Symbology</Label>
                    <Select value={s.barcode_format ?? "qrcode"} onValueChange={(v) => set("barcode_format", v)}>
                      <SelectTrigger className="h-9 text-xs font-medium bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qrcode" className="text-xs">QR Code (2D Authenticated URL - Recommended)</SelectItem>
                        <SelectItem value="code128" className="text-xs">Code 128 (Standard 1D Retail Barcode)</SelectItem>
                        <SelectItem value="code39" className="text-xs">Code 39 (Alphanumeric 1D)</SelectItem>
                        <SelectItem value="ean13" className="text-xs">EAN-13 (Standard Retail Product Barcode)</SelectItem>
                        <SelectItem value="upca" className="text-xs">UPC-A (North American 1D)</SelectItem>
                        <SelectItem value="datamatrix" className="text-xs">Data Matrix (Industrial 2D)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(s.barcode_format === "qrcode" || !s.barcode_format) ? (
                    <div className="space-y-3 pt-2 border-t border-border/50">
                      {/* QR Payload Mode */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">QR Payload Mode</Label>
                        <Select value={s.qr_data_mode ?? "url"} onValueChange={(v) => set("qr_data_mode", v)}>
                          <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="url" className="text-xs">Smart Authenticity Link (URL)</SelectItem>
                            <SelectItem value="raw" className="text-xs">Raw Serial Code String Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* QR Code Rendering Controls */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">QR Scale / Density (1–8)</Label>
                          <Input
                            type="number" step="1" min="1" max="8"
                            value={num("barcode_scale", 3)}
                            onChange={setNum("barcode_scale")}
                            className="h-9 text-xs font-mono bg-background"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Error Correction</Label>
                          <Select value={s.qr_ecl ?? "M"} onValueChange={(v) => set("qr_ecl", v)}>
                            <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="L" className="text-xs">L — Low (7% recovery)</SelectItem>
                              <SelectItem value="M" className="text-xs">M — Medium (15% · default)</SelectItem>
                              <SelectItem value="Q" className="text-xs">Q — Quartile (25%)</SelectItem>
                              <SelectItem value="H" className="text-xs">H — High (30% · max)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border p-2.5 col-span-2 sm:col-span-1">
                          <Label className="text-xs">Show serial below QR</Label>
                          <Switch checked={!!s.barcode_show_text} onCheckedChange={(v) => set("barcode_show_text", v)} />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                        <p className="font-semibold text-primary flex items-center gap-1.5">
                          <ScanLine className="w-3.5 h-3.5" />
                          Dual-Mode Scan Engine
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Scanning with a phone camera opens the authenticated verification portal. Internal handheld POS scanners automatically extract the serial for instantaneous cart addition.
                        </p>
                      </div>
                    </div>
                  ) : (

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Barcode Height (in)</Label>
                        <Input type="number" step="0.05" min="0.05" max="2" value={num("barcode_height_in", 0.2)} onChange={setNum("barcode_height_in")} className="h-9 text-xs font-mono bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Density / Scale (1-6)</Label>
                        <Input type="number" step="1" min="1" max="6" value={num("barcode_scale", 3)} onChange={setNum("barcode_scale")} className="h-9 text-xs font-mono bg-background" />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border p-2.5 sm:col-span-1 col-span-2">
                        <Label className="text-xs">Show text under bars</Label>
                        <Switch checked={!!s.barcode_show_text} onCheckedChange={(v) => set("barcode_show_text", v)} />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ================= PANEL 3: BRANDING & TYPOGRAPHY ================= */}
              <TabsContent value="branding" className="space-y-4 mt-0">
                {/* Brand Identity */}
                <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-3.5 shadow-2xs">
                  <Label className="text-xs font-bold text-foreground">Brand Identity &amp; Symbols</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Brand Name</Label>
                      <Input value={s.brand_name ?? ""} onChange={(e) => set("brand_name", e.target.value)} placeholder="ORIZINO" className="h-9 text-xs bg-background font-semibold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Serial Prefix</Label>
                      <Input value={s.serial_prefix ?? ""} onChange={(e) => set("serial_prefix", e.target.value.toUpperCase())} placeholder="ORZ" className="h-9 text-xs font-mono uppercase bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Currency Symbol</Label>
                      <Input value={s.currency_symbol ?? ""} onChange={(e) => set("currency_symbol", e.target.value)} placeholder="৳" className="h-9 text-xs bg-background" />
                    </div>
                  </div>
                </div>

                {/* Brand Watermark Studio */}
                <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-foreground">Centered Brand Watermark</Label>
                      <p className="text-[11px] text-muted-foreground">Subtle logo or brand watermark behind sticker content</p>
                    </div>
                    <Switch checked={s.show_watermark ?? true} onCheckedChange={(v) => set("show_watermark", v)} />
                  </div>

                  {(s.show_watermark ?? true) && (
                    <div className="space-y-3 pt-2 border-t border-border/50">
                      {/* Logo Source Indicator */}
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                        <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center p-1 shrink-0 overflow-hidden">
                          {s.watermark_url || brandLogoUrl ? (
                            <img
                              src={s.watermark_url || brandLogoUrl}
                              alt="Logo"
                              crossOrigin="anonymous"
                              className="w-full h-full object-contain filter grayscale contrast-150"
                            />
                          ) : (
                            <span className="text-[9px] font-black text-muted-foreground">TXT</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {s.watermark_url ? "Custom Watermark Image" : brandLogoUrl ? "Site Brand Logo Active" : "Text Watermark Active"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {s.watermark_url || brandLogoUrl || `Renders "${s.brand_name || "ORIZINO"}"`}
                          </p>
                        </div>
                      </div>

                      {/* Custom Watermark Image URL Override */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Custom Watermark URL (optional override)</Label>
                        <Input
                          value={s.watermark_url ?? ""}
                          onChange={(e) => set("watermark_url", e.target.value)}
                          placeholder="https://... (leave blank to use site logo)"
                          className="h-9 text-xs font-mono bg-background"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Watermark Opacity:</span>
                        <span className="font-mono font-bold text-primary">{Math.round(num("watermark_opacity", 0.08) * 100)}%</span>
                      </div>
                      <Slider
                        min={0.02}
                        max={0.40}
                        step={0.01}
                        value={[num("watermark_opacity", 0.08)]}
                        onValueChange={([val]) => set("watermark_opacity", val)}
                        className="py-1"
                      />
                      <div className="flex items-center gap-1.5">
                        {[
                          { label: "Subtle (4%)", val: 0.04 },
                          { label: "Standard (8%)", val: 0.08 },
                          { label: "Medium (15%)", val: 0.15 },
                          { label: "Prominent (25%)", val: 0.25 },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => set("watermark_opacity", opt.val)}
                            className={`px-2 py-1 rounded text-[11px] border font-medium transition-colors ${
                              num("watermark_opacity", 0.08) === opt.val
                                ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                                : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Typography Engine */}
                <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-3.5 shadow-2xs">
                  <Label className="text-xs font-bold text-foreground">Typography &amp; Text Scale</Label>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Font Family (CSS stack)</Label>
                    <Input value={s.font_family ?? ""} onChange={(e) => set("font_family", e.target.value)} placeholder="'Helvetica Neue', Arial, sans-serif" className="h-9 text-xs bg-background font-mono" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Header (pt)</Label>
                      <Input type="number" step="0.5" min="4" max="24" value={num("header_font_size_pt", 6.5)} onChange={setNum("header_font_size_pt")} className="h-9 text-xs font-mono bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Product Title (pt)</Label>
                      <Input type="number" step="0.5" min="4" max="24" value={num("product_name_font_size_pt", 5.5)} onChange={setNum("product_name_font_size_pt")} className="h-9 text-xs font-mono bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Footer / Price (pt)</Label>
                      <Input type="number" step="0.5" min="4" max="24" value={num("footer_font_size_pt", 5.5)} onChange={setNum("footer_font_size_pt")} className="h-9 text-xs font-mono bg-background" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between rounded-xl border border-border p-2.5">
                      <Label className="text-xs">Bold Brand Name</Label>
                      <Switch checked={s.brand_bold ?? true} onCheckedChange={(v) => set("brand_bold", v)} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border p-2.5">
                      <Label className="text-xs">Bold Price</Label>
                      <Switch checked={s.price_bold ?? true} onCheckedChange={(v) => set("price_bold", v)} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ================= PANEL 4: FIELDS & SYNC ================= */}
              <TabsContent value="fields" className="space-y-4 mt-0">
                {/* Field Visibility Grid */}
                <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-3.5 shadow-2xs">
                  <Label className="text-xs font-bold text-foreground">Visible Sticker Fields</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(kind === "order"
                      ? [
                          ["show_brand_mark", "Brand Mark", true],
                          ["show_order_number", "Order Number", true],
                          ["show_tracking_qr", "Tracking QR Code", true],
                          ["show_customer_name", "Customer Name", true],
                          ["show_customer_city", "Customer City", true],
                          ["show_phone", "Customer Phone", false],
                          ["show_cod_amount", "COD Amount", true],
                        ]
                      : [
                          ["show_brand", "Brand Name", true],
                          ["show_product_name", "Product Name", false],
                          ["show_size", "Size / Variant", true],
                          ["show_serial_code", "Serial Code", true],
                          ["show_price", "Selling Price", true],
                          ["show_original_price", "Strike-Through Price", true],
                          ["show_barcode", "Barcode / QR Graphic", true],
                        ]
                    ).map(([k, label, def]) => (
                      <div key={k as string} className="flex items-center justify-between rounded-xl border border-border/60 p-2.5 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <Label className="text-xs font-medium cursor-pointer" htmlFor={`switch-${k}`}>{label as string}</Label>
                        <Switch id={`switch-${k}`} checked={s[k as string] ?? (def as boolean)} onCheckedChange={(v) => set(k as string, v)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Google Sheets Sync Integration */}
                <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        Google Sheets Auto-Sync
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Keep serials and inventory in 2-way sync</p>
                    </div>
                    <Switch checked={!!s.sync_enabled} onCheckedChange={(v) => set("sync_enabled", v)} />
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Spreadsheet ID</Label>
                      <Input value={s.google_sheet_id ?? ""} onChange={(e) => set("google_sheet_id", e.target.value)} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" className="h-9 text-xs font-mono bg-background" />
                      <p className="text-[10px] text-muted-foreground">The string between /d/ and /edit in your Google Sheet link.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Sheet Tab Name</Label>
                      <Input value={s.google_sheet_tab ?? "Serials"} onChange={(e) => set("google_sheet_tab", e.target.value)} className="h-9 text-xs bg-background font-mono" />
                    </div>
                    {s.last_synced_at && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-emerald-500" />
                        Last synced: {new Date(s.last_synced_at).toLocaleString()}
                      </p>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSheetsModalOpen(true)}
                      className="w-full text-xs h-8 rounded-lg gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Open Full Google Sheets Sync Hub</span>
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </fieldset>
          </Tabs>
        </div>
      </div>

      {/* ================= 3. MODALS (Create, Import, Sample Sheet) ================= */}
      {/* Create New Preset Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Create New Preset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Preset Name *</Label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. 2x1 Retail Tag"
                className="h-9 text-xs"
                autoFocus
              />
            </div>
            {current?.name && (
              <p className="text-[11px] text-muted-foreground">
                Will clone all dimensions and formatting from <strong>"{current.name}"</strong>.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate(newPresetName)}
              disabled={!newPresetName.trim() || createMut.isPending}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {createMut.isPending ? "Creating…" : "Create Preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Sample Test Print Sheet Modal */}
      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-primary" />
              Test Sheet · {sampleCount} Sample Stickers
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Print this sample sheet to verify printer scaling and barcode scanability before bulk printing. Set printer scale to <strong>100% / Actual Size</strong> (no fit-to-page).
          </p>
          <div ref={sampleRef} className="print-sheet flex flex-wrap gap-2 p-3 bg-white rounded-xl max-h-[60vh] overflow-auto border border-border/80 shadow-inner">
            {sampleItems.map((item, i) => (
              <Sticker key={i} data={item} />
            ))}
          </div>
          <DialogFooter className="flex flex-row justify-between items-center w-full">
            <Button variant="outline" onClick={() => setSampleOpen(false)}>Close</Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportSamplePdf} disabled={exporting !== null} className="gap-1.5 text-xs">
                <FileDown className="w-3.5 h-3.5 text-primary" />
                <span>Export PDF</span>
              </Button>
              <Button onClick={() => window.print()} className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold">
                <Printer className="w-3.5 h-3.5" />
                <span>Print Sheet</span>
              </Button>
            </div>
          </DialogFooter>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .print-sheet, .print-sheet * { visibility: visible; }
              .print-sheet { position: fixed; inset: 0; background: white; padding: 0.1in; }
              @page { margin: 0.2in; }
            }
          `}</style>
        </DialogContent>
      </Dialog>

      {/* Import Presets Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-4 h-4 text-primary" />
              Import Sticker Presets
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Upload a JSON backup or paste JSON configuration below. Accepts a single preset object or an array of presets.
          </p>
          <div className="space-y-3 py-1">
            <Input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setImportText(text);
              }}
              className="text-xs h-9"
            />
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{ "name": "POS Thermal Roll", "width_in": 2, "height_in": 0.6, ... }'
              className="min-h-[160px] font-mono text-xs bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button
              onClick={() => parseAndImport(importText)}
              disabled={!importText.trim() || importMut.isPending}
              className="bg-primary text-primary-foreground font-semibold gap-1.5 text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              {importMut.isPending ? "Importing…" : "Import Presets"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgraded Google Sheets 2-Way Sync & Setup Hub */}
      <GoogleSheetsConfigModal open={sheetsModalOpen} onOpenChange={setSheetsModalOpen} />
    </div>
  );
}

