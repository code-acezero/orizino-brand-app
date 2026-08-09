"use client";
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Tag, ScanLine, QrCode, Printer, RefreshCw, Plus, Trash2, Upload, Download, Copy, Lock, Unlock, FileUp, Keyboard, Info, Pencil, FileImage, CheckSquare, Square, PackageSearch, X, CheckCheck, ArrowLeftRight } from "lucide-react";
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
import { reassignSerial, searchOrdersForAssignment } from "@/lib/offline-orders.functions";
import { Sticker } from "@/components/admin/products/Sticker";
import { validateStickerConfig, elementToPdfBlob, elementToJpegBlob, downloadBlob } from "@/lib/sticker-utils";
import { AlertTriangle, FileDown } from "lucide-react";
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
    scanner:    { title: "Barcode Scanner", desc: "Scan serials for sale, return or write-off" },
    sticker:    { title: "Sticker Setup",   desc: "Brand and layout for printed stickers" },
  };
  const meta = titles[tab] ?? titles.products;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold flex items-center gap-2">
          <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          {meta.title}
        </h1>
        <p className="text-sm text-muted-foreground">{meta.desc}</p>
      </div>

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



  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["serials", search, status],
    queryFn: () => list({ data: { search: search || undefined, status: status === "all" ? undefined : status } }),
  });

  const push = useMutation({
    mutationFn: () => pushFn(),
    onSuccess: (r: any) => toast({ title: "Synced to Sheets", description: `${r.pushed} rows pushed` }),
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });
  const pull = useMutation({
    mutationFn: () => pullFn(),
    onSuccess: (r: any) => {
      toast({ title: "Pulled from Sheets", description: `${r.updated} serials updated` });
      qc.invalidateQueries({ queryKey: ["serials"] });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["serials"] }),
  });
  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await del({ data: { id } });
    },
    onSuccess: () => {
      setSelected({});
      qc.invalidateQueries({ queryKey: ["serials"] });
      toast({ title: "Deleted selected serials" });
    },
    onError: (e: any) => toast({ title: "Bulk delete failed", description: e.message, variant: "destructive" }),
  });
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selectedCodes = rows.filter((r: any) => selected[r.id]).map((r: any) => r.serial_code);
  const allSelected = rows.length > 0 && rows.every((r: any) => selected[r.id]);
  const toggleAll = () => {
    if (allSelected) setSelected({});
    else setSelected(Object.fromEntries(rows.map((r: any) => [r.id, true])));
  };
  const sync = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r: any) => {
      toast({ title: "Stock synced", description: `${r.variantsUpdated} variant(s) and ${r.productsUpdated} product(s) updated from Stock & Serials` });
      qc.invalidateQueries({ queryKey: ["serials"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-select"] });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search serial..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="defective">Defective</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={openMapping}>
          <FileUp className="w-4 h-4 mr-1.5" />Mapping
        </Button>
        <Button variant="outline" size="sm" onClick={() => test.mutate()} disabled={test.isPending}>
          <ScanLine className="w-4 h-4 mr-1.5" />{test.isPending ? "Testing…" : "Test sheet"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => pull.mutate()} disabled={pull.isPending}>
          <Download className="w-4 h-4 mr-1.5" />Pull from Sheets
        </Button>
        <Button variant="outline" size="sm" onClick={() => push.mutate()} disabled={push.isPending}>
          <Upload className="w-4 h-4 mr-1.5" />Push to Sheets
        </Button>

        <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending} title="Recompute product/variant stock from remaining (not-sold) serials">
          <RefreshCw className={`w-4 h-4 mr-1.5 ${sync.isPending ? "animate-spin" : ""}`} />Sync stock
        </Button>
        <Button variant="outline" size="sm" onClick={() => setManualAddOpen(true)}>
          <Pencil className="w-4 h-4 mr-1.5" />Add serial
        </Button>
        <Button variant="outline" size="sm" onClick={() => setBulkExportOpen(true)}>
          <PackageSearch className="w-4 h-4 mr-1.5" />Bulk export stickers
        </Button>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Add stock</Button>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => setPrintCodes(selectedCodes)}>
            <Printer className="w-4 h-4 mr-1.5" />Print stickers
          </Button>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Delete ${selectedIds.length} serial(s)?`)) bulkDelete.mutate(selectedIds); }} disabled={bulkDelete.isPending}>
            <Trash2 className="w-4 h-4 mr-1.5" />Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected({})}>Clear</Button>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 w-8">
                  <button type="button" onClick={toggleAll} className="flex items-center justify-center text-muted-foreground hover:text-primary">
                    {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-3 py-2">Serial</th>
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-left px-3 py-2">Variant</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Sold at</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No serials yet. Click "Add stock" to generate some.</td></tr>
              ) : (
                rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => setSelected((s) => ({ ...s, [r.id]: !s[r.id] }))} className="flex items-center justify-center text-muted-foreground hover:text-primary">
                        {selected[r.id] ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.serial_code}</td>
                    <td className="px-3 py-2">{r.products?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{[r.product_variants?.size, r.product_variants?.color].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className={STATUS_COLORS[r.status]}>{r.status}</Badge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.sold_at ? new Date(r.sold_at).toLocaleString() : "—"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPrintCodes([r.serial_code])}
                        title={r.print_count > 0 ? `Printed ${r.print_count} time${r.print_count === 1 ? "" : "s"}` : "Not printed yet"}
                        className="relative"
                      >
                        <Printer className={`w-4 h-4 ${r.print_count > 0 ? "text-emerald-500" : ""}`} />
                        {r.print_count > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-500 text-white text-[9px] leading-[14px] text-center">
                            {r.print_count}
                          </span>
                        )}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReassignRow(r)} title="Edit status / assign to an order">
                        <ArrowLeftRight className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete serial?")) remove.mutate(r.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && <AddStockDialog onClose={() => setAddOpen(false)} onCreated={(codes) => { setAddOpen(false); setPrintCodes(codes); qc.invalidateQueries({ queryKey: ["serials"] }); }} />}
      {manualAddOpen && <ManualAddSerialDialog onClose={() => setManualAddOpen(false)} onCreated={() => { setManualAddOpen(false); qc.invalidateQueries({ queryKey: ["serials"] }); }} />}
      {bulkExportOpen && <BulkExportStickersDialog onClose={() => setBulkExportOpen(false)} />}
      {printCodes && <PrintStickersDialog codes={printCodes} onClose={() => setPrintCodes(null)} />}
      {reassignRow && (
        <ReassignSerialDialog
          row={reassignRow}
          onClose={() => setReassignRow(null)}
          onDone={() => { setReassignRow(null); qc.invalidateQueries({ queryKey: ["serials"] }); }}
        />
      )}

      <Dialog open={!!testResult} onOpenChange={(o) => !o && setTestResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Sheet test {testResult?.ok ? "✅ passed" : "❌ failed"}
              {typeof testResult?.ms === "number" && <span className="text-xs text-muted-foreground font-normal">{testResult.ms} ms</span>}
            </DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {(testResult?.steps ?? []).map((s: any, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className={s.ok ? "text-emerald-600" : "text-destructive"}>{s.ok ? "✓" : "✗"}</span>
                <div>
                  <div className="font-medium">{s.step}</div>
                  {s.detail && <div className="text-xs text-muted-foreground break-all">{s.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
          {testResult?.warnings?.length > 0 && (
            <div className="rounded-lg border border-border p-2 space-y-1 max-h-56 overflow-auto">
              <div className="text-xs font-semibold">Data checks ({testResult.warnings.length})</div>
              <ul className="text-xs space-y-1">
                {testResult.warnings.map((w: any, i: number) => (
                  <li key={i} className={w.level === "error" ? "text-destructive" : "text-amber-600 dark:text-amber-400"}>
                    • <span className="uppercase text-[10px] font-semibold mr-1">{w.type}</span>{w.message}
                    {w.hint && <div className="ml-3 mt-0.5 text-[11px] text-muted-foreground"><span className="font-semibold">Fix:</span> {w.hint}</div>}
                  </li>
                ))}

              </ul>
            </div>
          )}
          {testResult?.headers && (
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-1">Row 1 header columns ({testResult.headers.length}):</div>
              <div>{testResult.headers.join(" · ")}</div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Google Sheets column mapping</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            Configure headers and row offsets without touching code. <code>headerRow</code> and <code>dataStartRow</code> are 1-based.
            <code>serialColumn</code> / <code>statusColumn</code> are 1-based positions used when pulling back.
            Available fields: {mapFields.join(", ")}. Leave a column's <code>field</code> as <code>""</code> to write only its header.
          </p>
          <Textarea
            value={mapDraft}
            onChange={(e) => setMapDraft(e.target.value)}
            className="min-h-[320px] font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMapping.mutate()} disabled={saveMapping.isPending}>
              {saveMapping.isPending ? "Saving…" : "Save mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    queryFn: async () => productId ? (await supabase.from("product_variants").select("id, size, color").eq("product_id", productId)).data ?? [] : [],
    enabled: !!productId,
  });

  const filteredProducts = useMemo(() => {
    const s = bulkSearch.trim().toLowerCase();
    if (!s) return products;
    return (products as any[]).filter((p) =>
      p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s));
  }, [products, bulkSearch]);

  const toggleBulk = (p: any) => {
    setBulkSel((prev) => {
      const cur = prev[p.id] ?? { selected: false, qty: bulkQtyMode === "auto" ? (p.stock_quantity ?? bulkDefaultQty) : bulkDefaultQty };
      return { ...prev, [p.id]: { ...cur, selected: !cur.selected } };
    });
  };
  const setBulkQty = (id: string, qty: number) => {
    setBulkSel((prev) => ({ ...prev, [id]: { selected: prev[id]?.selected ?? true, qty } }));
  };
  const selectAllFiltered = () => {
    setBulkSel((prev) => {
      const next = { ...prev };
      for (const p of filteredProducts as any[]) {
        const qty = bulkQtyMode === "auto" ? (p.stock_quantity ?? bulkDefaultQty) : bulkDefaultQty;
        next[p.id] = { selected: true, qty: next[p.id]?.qty ?? qty };
      }
      return next;
    });
  };
  const clearSelection = () => setBulkSel({});

  const selectedCount = Object.values(bulkSel).filter((s) => s.selected).length;
  const totalUnits = Object.values(bulkSel).filter((s) => s.selected).reduce((n, s) => n + (s.qty || 0), 0);

  async function submit() {
    setBusy(true);
    try {
      if (mode === "bulk") {
        const picks = (products as any[])
          .map((p) => ({ p, s: bulkSel[p.id] }))
          .filter((x) => x.s?.selected && (x.s.qty || 0) > 0);
        if (!picks.length) throw new Error("Select at least one product with a quantity");
        const allCodes: string[] = [];
        let totalCreated = 0;
        for (const { p, s } of picks) {
          const r: any = await gen({ data: { productId: p.id, variantId: null, quantity: Math.min(Math.max(1, s.qty | 0), 500) } });
          totalCreated += r.created ?? 0;
          allCodes.push(...(r.codes ?? []));
        }
        toast({ title: `Generated ${totalCreated} serials across ${picks.length} products` });
        onCreated(allCodes);
        return;
      }
      if (!productId) return toast({ title: "Pick a product", variant: "destructive" });
      if (mode === "auto") {
        const r: any = await gen({ data: { productId, variantId: variantId || null, quantity } });
        toast({ title: `Generated ${r.created} serials` });
        onCreated(r.codes);
      } else {
        const codes = manualCodes.split(/\s+|,/).map((s) => s.trim()).filter(Boolean);
        if (!codes.length) throw new Error("Paste at least one code");
        await imp({ data: { productId, variantId: variantId || null, codes } });
        toast({ title: `Imported ${codes.length} serials` });
        onCreated(codes);
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={mode === "bulk" ? "max-w-2xl" : "max-w-md"}>
        <DialogHeader><DialogTitle>Add stock (generate serials)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button variant={mode === "auto" ? "default" : "outline"} size="sm" onClick={() => setMode("auto")}>Auto</Button>
            <Button variant={mode === "manual" ? "default" : "outline"} size="sm" onClick={() => setMode("manual")}>Manual paste</Button>
            <Button variant={mode === "bulk" ? "default" : "outline"} size="sm" onClick={() => setMode("bulk")}>Bulk from products</Button>
          </div>

          {mode !== "bulk" && (
            <>
              <div>
                <Label>Product</Label>
                <Select value={productId} onValueChange={(v) => { setProductId(v); setVariantId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger>
                  <SelectContent>
                    {(products as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {variants.length > 0 && (
                <div>
                  <Label>Variant (optional)</Label>
                  <Select value={variantId} onValueChange={(v) => setVariantId(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="No variant" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {variants.map((v: any) => <SelectItem key={v.id} value={v.id}>{[v.size, v.color].filter(Boolean).join(" / ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {mode === "auto" ? (
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min={1} max={500} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
                </div>
              ) : (
                <div>
                  <Label>Codes (one per line or comma-separated)</Label>
                  <textarea value={manualCodes} onChange={(e) => setManualCodes(e.target.value)}
                    className="w-full h-32 rounded-md border border-input bg-background p-2 font-mono text-xs" />
                </div>
              )}
            </>
          )}

          {mode === "bulk" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="Search products…" value={bulkSearch} onChange={(e) => setBulkSearch(e.target.value)} className="flex-1 min-w-[180px]" />
                <div className="flex items-center gap-1 text-xs">
                  <Button size="sm" variant={bulkQtyMode === "auto" ? "default" : "outline"} onClick={() => setBulkQtyMode("auto")}>Auto qty (from product)</Button>
                  <Button size="sm" variant={bulkQtyMode === "manual" ? "default" : "outline"} onClick={() => setBulkQtyMode("manual")}>Manual qty</Button>
                </div>
                {bulkQtyMode === "manual" && (
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Default</Label>
                    <Input type="number" min={1} max={500} value={bulkDefaultQty} onChange={(e) => setBulkDefaultQty(parseInt(e.target.value) || 1)} className="w-20 h-8" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Button size="sm" variant="ghost" onClick={selectAllFiltered}>Select all shown</Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
                <span className="ml-auto text-muted-foreground">{selectedCount} products · {totalUnits} serials</span>
              </div>
              <div className="rounded-md border border-border max-h-[360px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs sticky top-0">
                    <tr>
                      <th className="w-8 px-2 py-1.5"></th>
                      <th className="text-left px-2 py-1.5">Product</th>
                      <th className="text-left px-2 py-1.5 w-24">SKU</th>
                      <th className="text-right px-2 py-1.5 w-20">In stock</th>
                      <th className="text-right px-2 py-1.5 w-24">Add qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">No products</td></tr>
                    ) : (filteredProducts as any[]).map((p: any) => {
                      const sel = bulkSel[p.id];
                      const checked = !!sel?.selected;
                      const qty = sel?.qty ?? (bulkQtyMode === "auto" ? (p.stock_quantity ?? bulkDefaultQty) : bulkDefaultQty);
                      return (
                        <tr key={p.id} className="border-t border-border">
                          <td className="px-2 py-1.5"><input type="checkbox" checked={checked} onChange={() => toggleBulk(p)} /></td>
                          <td className="px-2 py-1.5">{p.name}</td>
                          <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">{p.sku ?? "—"}</td>
                          <td className="px-2 py-1.5 text-right">{p.stock_quantity ?? 0}</td>
                          <td className="px-2 py-1.5 text-right">
                            <Input type="number" min={1} max={500} value={qty}
                              onChange={(e) => setBulkQty(p.id, parseInt(e.target.value) || 1)}
                              disabled={!checked}
                              className="w-20 h-8 text-right ml-auto" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "..." : mode === "bulk" ? `Create ${totalUnits} serials` : "Create"}
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
        <DialogHeader>
          <DialogTitle>Add a serial manually</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          For a serial that already exists physically (e.g. printed earlier) but isn't in the system yet.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select value={productId} onValueChange={(v) => { setProductId(v); setVariantId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {(products as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {variants.length > 0 && (
            <div className="space-y-1.5">
              <Label>Variant</Label>
              <Select value={variantId} onValueChange={(v) => setVariantId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="No variant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(variants as any[]).map((v) => <SelectItem key={v.id} value={v.id}>{[v.size, v.color].filter(Boolean).join(" / ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Serial code</Label>
            <Input value={serialCode} onChange={(e) => setSerialCode(e.target.value)} placeholder="e.g. ORZ-GHK0001B-000001" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="defective">Defective</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add serial"}</Button>
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
      <DialogContent className="max-w-lg">
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
  const { data: activeSettings } = useQuery({ queryKey: ["sticker-settings"], queryFn: () => settingsFn() });
  const { data: presets = [] } = useQuery<any[]>({ queryKey: ["sticker-presets"], queryFn: () => listPresetsFn() });
  const { data: rows = [] } = useQuery({
    queryKey: ["print-serials", codes],
    queryFn: async () =>
      (await (supabase.from as any)("product_serials")
        .select("serial_code, products(name, price, compare_at_price, sticker_preset_id), product_variants(size)")
        .in("serial_code", codes)).data ?? [],
  });

  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"pdf" | "jpg" | null>(null);

  // Print sheets are ~8in of usable width (Letter/A4 minus margins); the
  // widest a layout can go depends on how wide one sticker is.
  const stickerWidthIn = activeSettings?.width_in || 2;
  const maxColumns = Math.max(1, Math.floor(8 / stickerWidthIn));
  const [columns, setColumns] = useState(Math.min(4, maxColumns));

  const presetsById = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of presets) m.set(p.id, p);
    return m;
  }, [presets]);

  function configFor(row: any): any {
    const id = row.products?.sticker_preset_id;
    return (id && presetsById.get(id)) || activeSettings || { brand_name: "ORIZINO", show_size: true, show_original_price: true, currency_symbol: "৳" };
  }

  async function markPrinted() {
    try {
      await markPrintedFn({ data: { codes } });
      qc.invalidateQueries({ queryKey: ["serials"] });
    } catch { /* best-effort — never block the export on this */ }
  }

  async function exportPdf() {
    if (!sheetRef.current) return;
    setExporting("pdf");
    try {
      const blob = await elementToPdfBlob(sheetRef.current);
      downloadBlob(blob, `stickers-${new Date().toISOString().slice(0, 10)}.pdf`);
      await markPrinted();
    } catch (e: any) {
      toast({ title: "PDF export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }

  async function exportJpg() {
    if (!sheetRef.current) return;
    setExporting("jpg");
    try {
      const blob = await elementToJpegBlob(sheetRef.current);
      downloadBlob(blob, `stickers-${new Date().toISOString().slice(0, 10)}.jpg`);
      await markPrinted();
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Print stickers ({rows.length})</DialogTitle></DialogHeader>

        <div className="flex items-center gap-2 text-sm">
          <Label className="text-xs text-muted-foreground shrink-0">Layout columns</Label>
          <Input
            type="number"
            min={1}
            max={maxColumns}
            value={columns}
            onChange={(e) => setColumns(Math.max(1, Math.min(maxColumns, +e.target.value || 1)))}
            className="w-20 h-8"
          />
          <span className="text-[11px] text-muted-foreground">Max {maxColumns} for a {stickerWidthIn}in sticker</span>
        </div>

        <div
          ref={sheetRef}
          className="print-sheet grid gap-2 p-2 bg-white rounded-lg max-h-[60vh] overflow-auto"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {rows.map((r: any) => {
            const cfg = configFor(r);
            return (
              <Sticker key={r.serial_code} data={{
                serialCode: r.serial_code,
                productName: r.products?.name ?? "",
                size: r.product_variants?.size,
                price: r.products?.price ?? 0,
                compareAtPrice: r.products?.compare_at_price,
                brand: cfg.brand_name,
                currency: cfg.currency_symbol,
                showSize: cfg.show_size,
                showOriginalPrice: cfg.show_original_price,
                config: cfg,
              }} />
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={exportJpg} disabled={!!exporting || !rows.length}>
            <FileImage className="w-4 h-4 mr-1.5" />{exporting === "jpg" ? "Exporting…" : "Export JPG"}
          </Button>
          <Button variant="outline" onClick={exportPdf} disabled={!!exporting || !rows.length}>
            <FileDown className="w-4 h-4 mr-1.5" />{exporting === "pdf" ? "Exporting…" : "Export PDF"}
          </Button>
          <Button onClick={doPrint} disabled={!rows.length}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
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
  const [manualCode, setManualCode] = useState("");
  const [current, setCurrent] = useState<any>(null);
  const [chooseAction, setChooseAction] = useState<null | "cancel" | "return" | "defective">(null);
  const [confirmSell, setConfirmSell] = useState(false);

  // ── Order-binding scan session ──
  // Public product-lookup pages rely on `product_serials.sold_order_id` to
  // show "which order was this shipped in" — so a proper scan-to-fulfill
  // workflow needs to actually populate that, not just flip status to sold.
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [boundOrder, setBoundOrder] = useState<{ id: string; order_number: string } | null>(null);
  const [orderItems, setOrderItems] = useState<BoundOrderItem[]>([]);
  const [completeOpen, setCompleteOpen] = useState(false);

  const { data: confirmedOrders = [], isFetching: ordersLoading } = useQuery({
    queryKey: ["scanner-confirmed-orders", orderSearch],
    queryFn: async () => {
      let q = supabase.from("orders").select("id, order_number, total, created_at").eq("status", "confirmed").order("created_at", { ascending: false }).limit(50);
      if (orderSearch.trim()) q = q.ilike("order_number", `%${orderSearch.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
    enabled: orderPickerOpen,
  });

  async function selectOrder(order: { id: string; order_number: string }) {
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
    setActive(true);
  }

  function startScan() {
    if (boundOrder) { setActive(true); return; }
    setOrderPickerOpen(true);
  }

  function stopAndReset() {
    setActive(false);
    setBoundOrder(null);
    setOrderItems([]);
  }

  async function handleCode(code: string, ctx?: { mode?: "camera" | "hid" | "manual"; raw?: string }) {
    const mode = ctx?.mode ?? "manual";
    const raw = ctx?.raw ?? code;

    // Optional focus-input action: forward to a specific field.
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
        /* fall through to lookup */
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

      // Order-binding mode: every scan must match a still-outstanding item
      // on the selected order, or it's rejected outright.
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

      // Regular (non-order) lookup mode — unchanged behaviour.
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

  if (loading) return <div className="py-10 flex justify-center"><SectionLoader tone="platinum" size={48} /></div>;
  if (!allowed) return <ScannerAccessDenied />;

  const orderChecklist = boundOrder ? (
    <div className="space-y-1.5">
      <p className="text-white/90 text-xs font-semibold">Order {boundOrder.order_number}</p>
      {orderItems.map((it) => (
        <div key={it.productId} className="flex items-center justify-between text-xs">
          <span className={`truncate ${it.scanned >= it.ordered ? "text-emerald-400" : "text-white/80"}`}>{it.name}{it.sku ? ` · ${it.sku}` : ""}</span>
          <span className={`shrink-0 ml-2 font-mono ${it.scanned >= it.ordered ? "text-emerald-400" : "text-white/60"}`}>{it.scanned}/{it.ordered}</span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2 min-w-0">
      <div className="lg:col-span-2 flex flex-wrap items-center gap-2 justify-end min-w-0">
        {boundOrder && (
          <Badge variant="outline" className="mr-auto">
            Binding to order {boundOrder.order_number}
            <button type="button" onClick={stopAndReset} className="ml-1.5 hover:text-destructive"><X className="w-3 h-3 inline" /></button>
          </Badge>
        )}
        <ScannerSettingsButton />
      </div>
      <div className="space-y-3 min-w-0">
        <BarcodeScanner
          active={active}
          onToggle={() => (active ? stopAndReset() : startScan())}
          onScan={(c, ctx) => handleCode(c, ctx)}
          overlayContent={orderChecklist}
        />
        {boundOrder && (
          <div className="rounded-xl border border-border p-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Order {boundOrder.order_number} — items</p>
            {orderItems.map((it) => (
              <div key={it.productId} className="flex items-center justify-between text-sm">
                <span className={it.scanned >= it.ordered ? "text-emerald-500" : ""}>{it.name}{it.sku ? <span className="text-muted-foreground font-mono text-xs ml-1">{it.sku}</span> : null}</span>
                <span className={`font-mono text-xs ${it.scanned >= it.ordered ? "text-emerald-500" : "text-muted-foreground"}`}>{it.scanned}/{it.ordered}</span>
              </div>
            ))}
          </div>
        )}
        <div className="rounded-xl border border-border p-3 space-y-2">
          <Label>Or enter manually</Label>
          <div className="flex gap-2">
            <Input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="ORZ-PRD-000123" className="font-mono" />
            <Button onClick={() => manualCode && handleCode(manualCode.trim(), { mode: "manual", raw: manualCode })}>Look up</Button>
          </div>
        </div>
      </div>


      <div className="rounded-xl border border-border p-4 bg-card/50 min-w-0 overflow-hidden">
        <h3 className="font-semibold mb-3">Recent scan</h3>
        {current ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Serial</span><span className="font-mono">{current.serial_code}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span>{current.products?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={STATUS_COLORS[current.status]}>{current.status}</Badge></div>
          </div>
        ) : <p className="text-sm text-muted-foreground">Scan or enter a serial to see details.</p>}
      </div>

      <div className="rounded-xl border border-border p-4 bg-muted/30 lg:col-span-2 min-w-0 overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Keyboard className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-2 text-sm min-w-0">
            <h4 className="font-semibold flex items-center gap-2">Physical barcode scanner setup <Info className="w-3.5 h-3.5 text-muted-foreground" /></h4>
            <p className="text-xs text-muted-foreground">
              Any USB or Bluetooth barcode scanner that behaves as a keyboard (HID mode — the factory default for
              Zebra, Honeywell, Symcode, Netum, Eyoyo, Tera and most brands) works with this panel out of the box.
              No drivers, no pairing utility.
            </p>
            <ol className="list-decimal ml-4 text-xs text-muted-foreground space-y-1">
              <li>Plug in the scanner (USB) or pair it (Bluetooth → keyboard mode).</li>
              <li>Scan the manufacturer's <b>“Add Enter suffix (CR/LF)”</b> configuration barcode. Most units ship with this already enabled.</li>
              <li>Set the symbology to <b>Code128</b> or <b>QR</b> to match the stickers this panel prints. EAN/UPC also decode.</li>
              <li>Open this page and just scan — the <b>Physical</b> toggle above must be on (it is by default).</li>
              <li>Optional: enable <b>Continuous</b> for rapid stock-taking, or disable it to auto-stop after one scan.</li>
            </ol>
            <p className="text-[11px] text-muted-foreground">
              Tip: the wedge listener is global. Focus can be anywhere on the page — the scanner still works. Keystrokes arriving faster than 50 ms apart and terminated by Enter are treated as a scan; regular typing is ignored.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 grid gap-4 lg:grid-cols-2 min-w-0">
        <div className="min-w-0"><ScannerHistoryPanel /></div>
        <div className="min-w-0"><ScannerTestPanel /></div>
      </div>


      <Dialog open={confirmSell} onOpenChange={setConfirmSell}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as sold?</DialogTitle></DialogHeader>
          <p className="text-sm">Serial <b className="font-mono">{current?.serial_code}</b> — {current?.products?.name}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSell(false)}>Cancel</Button>
            <Button onClick={() => doAction("sell")}>Confirm sold</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chooseAction !== null} onOpenChange={(o) => !o && setChooseAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update sold serial</DialogTitle></DialogHeader>
          <p className="text-sm mb-2"><b className="font-mono">{current?.serial_code}</b> is already sold. Pick a new status:</p>
          <div className="space-y-2">
            {(["cancel", "return", "defective"] as const).map((a) => (
              <label key={a} className="flex items-center gap-2 p-2 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                <input type="radio" name="a" checked={chooseAction === a} onChange={() => setChooseAction(a)} />
                <span className="capitalize">{a === "return" ? "Returned" : a === "cancel" ? "Cancelled" : "Defective / rejected"}</span>
                <span className="ml-auto text-xs text-muted-foreground">{a === "defective" ? "removed from stock" : "back to available"}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChooseAction(null)}>Cancel</Button>
            <Button onClick={() => chooseAction && doAction(chooseAction)}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orderPickerOpen} onOpenChange={setOrderPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select an order to fulfill</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Scans will be matched against this order's items and bound to it once confirmed.
          </p>
          <Input placeholder="Search order number…" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border/60">
            {ordersLoading ? (
              <div className="p-6 flex justify-center"><SectionLoader tone="platinum" size={32} /></div>
            ) : confirmedOrders.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No confirmed orders found.</p>
            ) : (
              confirmedOrders.map((o: any) => (
                <button key={o.id} type="button" onClick={() => selectOrder(o)} className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted/40 transition-colors">
                  <span className="font-mono">{o.order_number}</span>
                  <span className="text-xs text-muted-foreground">৳{o.total}</span>
                </button>
              ))
            )}
          </div>
          <DialogFooter className="!justify-between">
            <Button variant="ghost" onClick={() => { setOrderPickerOpen(false); setActive(true); }}>Scan without an order</Button>
            <Button variant="outline" onClick={() => setOrderPickerOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-2">
            <CheckCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">Scan complete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            All items for order <span className="font-mono">{boundOrder?.order_number}</span> have been scanned and bound to this order.
          </p>
          <DialogFooter className="!justify-center">
            <Button onClick={() => { setCompleteOpen(false); stopAndReset(); }}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Sticker Setup ---------------- */

export function StickerSetupTab({ kind = "product_serial" }: { kind?: "product_serial" | "order" } = {}) {
  const listFn = useServerFn(listStickerPresets);
  const updateFn = useServerFn(updateStickerSettings);
  const createFn = useServerFn(createStickerPreset);
  const activateFn = useServerFn(activateStickerPreset);
  const deleteFn = useServerFn(deleteStickerPreset);
  const duplicateFn = useServerFn(duplicateStickerPreset);
  const importFn = useServerFn(importStickerPresets);
  const qc = useQueryClient();

  const { data: presets = [] } = useQuery<any[]>({ queryKey: ["sticker-presets", kind], queryFn: () => listFn({ data: { kind } }) });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(null);
  const [locked, setLocked] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const activeId = presets.find((p: any) => p.is_active)?.id ?? presets[0]?.id ?? null;
  const currentId = selectedId ?? activeId;

  const current = presets.find((p: any) => p.id === currentId) ?? {};
  const s = form ?? current;
  const editLocked = locked && currentId === activeId && !form;


  function set(k: string, v: any) { setForm({ ...(form ?? current), [k]: v }); }

  const save = useMutation({
    mutationFn: () => updateFn({ data: { ...(form ?? current), id: currentId } }),
    onSuccess: () => {
      toast({ title: "Preset saved" });
      qc.invalidateQueries({ queryKey: ["sticker-presets", kind] });
      qc.invalidateQueries({ queryKey: ["sticker-settings"] });
      setForm(null);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const name = window.prompt("Preset name", "New preset");
      if (!name) return null;
      return createFn({ data: { name, copy_from_id: currentId ?? null, kind } });
    },
    onSuccess: (row: any) => {
      if (!row) return;
      qc.invalidateQueries({ queryKey: ["sticker-presets", kind] });
      setSelectedId(row.id);
      setForm(null);
      toast({ title: "Preset created" });
    },
    onError: (e: any) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const activateMut = useMutation({
    mutationFn: () => activateFn({ data: { id: currentId! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sticker-presets", kind] });
      qc.invalidateQueries({ queryKey: ["sticker-settings"] });
      toast({ title: "Preset activated" });
    },
    onError: (e: any) => toast({ title: "Activate failed", description: e.message, variant: "destructive" }),
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
    onError: (e: any) => toast({ title: "Duplicate failed", description: e.message, variant: "destructive" }),
  });

  const importMut = useMutation({
    mutationFn: (presets: any[]) => importFn({ data: { presets } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["sticker-presets", kind] });
      setImportOpen(false);
      setImportText("");
      toast({ title: `Imported ${res?.created ?? 0} preset(s)` });
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  function parseAndImport(text: string) {
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      if (!arr.length) throw new Error("No presets found");
      importMut.mutate(arr);
    } catch (e: any) {
      toast({ title: "Invalid JSON", description: e.message, variant: "destructive" });
    }
  }

  function exportPreset(all: boolean) {
    const payload = all ? presets : [current];
    const clean = payload.map((p: any) => {
      const c = { ...p };
      delete c.id; delete c.created_at; delete c.updated_at; delete c.is_active;
      return c;
    });
    const json = JSON.stringify(all ? clean : clean[0], null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const name = all ? "sticker-presets.json" : `sticker-preset-${(current?.name ?? "preset").replace(/\s+/g, "-")}.json`;
    downloadBlob(blob, name);
  }

  async function copyExportToClipboard() {
    const clean = { ...current };
    delete clean.id; delete clean.created_at; delete clean.updated_at; delete clean.is_active;
    await navigator.clipboard.writeText(JSON.stringify(clean, null, 2));
    toast({ title: "Copied preset JSON" });
  }


  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: currentId! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sticker-presets", kind] });
      setSelectedId(null);
      setForm(null);
      toast({ title: "Preset deleted" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const preview = useMemo(() => ({
    serialCode: `${(s.serial_prefix ?? "ORZ")}-SAMPLE-000123`,
    productName: "Sample Shirt",
    size: "M",
    price: 799,
    compareAtPrice: 999,
    brand: s.brand_name ?? "ORIZINO",
    currency: s.currency_symbol ?? "৳",
    showSize: s.show_size ?? true,
    showOriginalPrice: s.show_original_price ?? true,
    config: s,
  }), [s]);


  const num = (k: string, def: number) => (s[k] ?? def);
  const setNum = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value === "" ? null : Number(e.target.value));

  const warnings = useMemo(() => validateStickerConfig(s ?? {}), [s]);
  const hasErrors = warnings.some((w) => w.level === "error");

  const sampleCount = 12;
  const sampleRef = useRef<HTMLDivElement>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const sampleItems = useMemo(
    () => Array.from({ length: sampleCount }, (_, i) => ({
      ...preview,
      serialCode: `${(s.serial_prefix ?? "ORZ")}-SAMPLE-${String(i + 1).padStart(4, "0")}`,
    })),
    [preview, s.serial_prefix],
  );

  async function exportSamplePdf() {
    if (!sampleRef.current) return;
    setExporting(true);
    try {
      const blob = await elementToPdfBlob(sampleRef.current);
      downloadBlob(blob, `sticker-preset-${(s.name ?? "sample").replace(/\s+/g, "-")}.pdf`);
    } catch (e: any) {
      toast({ title: "PDF export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }


  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {/* Presets */}
        <section className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              Presets
              {currentId === activeId && <Badge variant="secondary" className="text-xs">Active</Badge>}
              {editLocked && <Badge variant="outline" className="text-xs gap-1"><Lock className="w-3 h-3" />Locked</Badge>}
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={currentId ?? undefined} onValueChange={(v) => { setSelectedId(v); setForm(null); setLocked(true); }}>
              <SelectTrigger className="min-w-[220px] flex-1"><SelectValue placeholder="Select preset" /></SelectTrigger>
              <SelectContent>
                {presets.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}{p.is_active ? " • active" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              <Plus className="w-4 h-4 mr-1" />New
            </Button>
            <Button size="sm" variant="outline" onClick={() => duplicateMut.mutate()} disabled={!currentId || duplicateMut.isPending}>
              <Copy className="w-4 h-4 mr-1" />Duplicate
            </Button>
            <Button size="sm" variant="outline" onClick={() => activateMut.mutate()} disabled={!currentId || currentId === activeId || activateMut.isPending}>
              Set active
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
              if (!currentId) return;
              if (window.confirm("Delete this preset?")) deleteMut.mutate();
            }} disabled={!currentId || currentId === activeId || deleteMut.isPending}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
            {editLocked ? (
              <>
                <Button size="sm" variant="default" onClick={() => setLocked(false)}>
                  <Unlock className="w-4 h-4 mr-1" />Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => duplicateMut.mutate()} disabled={!currentId || duplicateMut.isPending}>
                  <Copy className="w-4 h-4 mr-1" />Save as new
                </Button>
              </>
            ) : currentId === activeId && (
              <Button size="sm" variant="ghost" onClick={() => { setForm(null); setLocked(true); }}>
                <Lock className="w-4 h-4 mr-1" />Lock
              </Button>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => exportPreset(false)} disabled={!currentId}>
                <Download className="w-4 h-4 mr-1" />Export
              </Button>
              <Button size="sm" variant="ghost" onClick={() => exportPreset(true)} disabled={!presets.length}>
                Export all
              </Button>
              <Button size="sm" variant="ghost" onClick={copyExportToClipboard} disabled={!currentId}>
                Copy JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <FileUp className="w-4 h-4 mr-1" />Import
              </Button>
            </div>
          </div>
          <div>
            <Label>Preset name</Label>
            <Input value={s.name ?? ""} onChange={(e) => set("name", e.target.value)} disabled={editLocked} />
          </div>
        </section>

        <fieldset disabled={editLocked} className={`space-y-6 transition-opacity duration-200 ${editLocked ? "opacity-60" : "opacity-100"}`}>


        {/* Branding */}
        <section className="space-y-3">
          <h4 className="font-semibold text-sm">Branding</h4>
          <div>
            <Label>Brand name</Label>
            <Input value={s.brand_name ?? ""} onChange={(e) => set("brand_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Serial prefix</Label>
              <Input value={s.serial_prefix ?? ""} onChange={(e) => set("serial_prefix", e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label>Currency symbol</Label>
              <Input value={s.currency_symbol ?? ""} onChange={(e) => set("currency_symbol", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Sizing */}
        <section className="space-y-3">
          <h4 className="font-semibold text-sm">Sizing (inches)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Width</Label>
              <Input type="number" step="0.05" min="0.5" value={num("width_in", 2)} onChange={setNum("width_in")} />
            </div>
            <div>
              <Label>Height</Label>
              <Input type="number" step="0.05" min="0.25" value={num("height_in", 0.5)} onChange={setNum("height_in")} />
            </div>
            <div>
              <Label>Padding X</Label>
              <Input type="number" step="0.01" min="0" value={num("padding_x_in", 0.05)} onChange={setNum("padding_x_in")} />
            </div>
            <div>
              <Label>Padding Y</Label>
              <Input type="number" step="0.01" min="0" value={num("padding_y_in", 0.03)} onChange={setNum("padding_y_in")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Border width (pt, 0 = none)</Label>
              <Input type="number" step="0.25" min="0" value={num("border_width_pt", 1)} onChange={setNum("border_width_pt")} />
            </div>
            <div>
              <Label>Border color</Label>
              <Input type="color" value={s.border_color ?? "#000000"} onChange={(e) => set("border_color", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Colors & Typography */}
        <section className="space-y-3">
          <h4 className="font-semibold text-sm">Colors & typography</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Background</Label>
              <Input type="color" value={s.background_color ?? "#FFFFFF"} onChange={(e) => set("background_color", e.target.value)} />
            </div>
            <div>
              <Label>Text color</Label>
              <Input type="color" value={s.text_color ?? "#000000"} onChange={(e) => set("text_color", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Font family (CSS)</Label>
            <Input value={s.font_family ?? ""} onChange={(e) => set("font_family", e.target.value)} placeholder="Helvetica Neue, Arial, sans-serif" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Header (pt)</Label>
              <Input type="number" step="0.5" min="4" value={num("header_font_size_pt", 6)} onChange={setNum("header_font_size_pt")} />
            </div>
            <div>
              <Label>Footer (pt)</Label>
              <Input type="number" step="0.5" min="4" value={num("footer_font_size_pt", 5.5)} onChange={setNum("footer_font_size_pt")} />
            </div>
            <div>
              <Label>Product name (pt)</Label>
              <Input type="number" step="0.5" min="4" value={num("product_name_font_size_pt", 5.5)} onChange={setNum("product_name_font_size_pt")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label>Bold brand</Label>
              <Switch checked={s.brand_bold ?? true} onCheckedChange={(v) => set("brand_bold", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label>Bold price</Label>
              <Switch checked={s.price_bold ?? true} onCheckedChange={(v) => set("price_bold", v)} />
            </div>
          </div>
        </section>

        {/* Barcode */}
        <section className="space-y-3">
          <h4 className="font-semibold text-sm">Barcode</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Format</Label>
              <Select value={s.barcode_format ?? "code128"} onValueChange={(v) => set("barcode_format", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="code128">Code 128</SelectItem>
                  <SelectItem value="code39">Code 39</SelectItem>
                  <SelectItem value="ean13">EAN-13</SelectItem>
                  <SelectItem value="upca">UPC-A</SelectItem>
                  <SelectItem value="qrcode">QR code</SelectItem>
                  <SelectItem value="datamatrix">Data Matrix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Height (in)</Label>
              <Input type="number" step="0.05" min="0.05" value={num("barcode_height_in", 0.2)} onChange={setNum("barcode_height_in")} />
            </div>
            <div>
              <Label>Scale</Label>
              <Input type="number" step="1" min="1" max="6" value={num("barcode_scale", 2)} onChange={setNum("barcode_scale")} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label>Show text under bars</Label>
              <Switch checked={!!s.barcode_show_text} onCheckedChange={(v) => set("barcode_show_text", v)} />
            </div>
          </div>
        </section>

        {/* Field visibility */}
        <section className="space-y-2">
          <h4 className="font-semibold text-sm">Fields</h4>
          {(kind === "order"
            ? [
                ["show_brand_mark", "Show brand mark", true],
                ["show_order_number", "Show order number", true],
                ["show_tracking_qr", "Show tracking QR code", true],
                ["show_customer_name", "Show customer name", true],
                ["show_customer_city", "Show customer city", true],
                ["show_phone", "Show customer phone", false],
                ["show_cod_amount", "Show COD amount", true],
              ]
            : [
                ["show_brand", "Show brand", true],
                ["show_product_name", "Show product name", false],
                ["show_size", "Show size", true],
                ["show_serial_code", "Show serial code", true],
                ["show_price", "Show price", true],
                ["show_original_price", "Show strike-through original price", true],
                ["show_barcode", "Show barcode", true],
              ]
          ).map(([k, label, def]) => (
            <div key={k as string} className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label>{label as string}</Label>
              <Switch checked={s[k as string] ?? (def as boolean)} onCheckedChange={(v) => set(k as string, v)} />
            </div>
          ))}
        </section>

        {/* Google Sheets sync */}
        <section className="pt-2 border-t border-border space-y-3">
          <h4 className="font-semibold text-sm">Google Sheets sync</h4>
          <div>
            <Label>Spreadsheet ID</Label>
            <Input value={s.google_sheet_id ?? ""} onChange={(e) => set("google_sheet_id", e.target.value)} placeholder="1BxiMVs..." />
            <p className="text-xs text-muted-foreground mt-1">The ID between /d/ and /edit in your Sheet URL.</p>
          </div>
          <div>
            <Label>Tab name</Label>
            <Input value={s.google_sheet_tab ?? "Serials"} onChange={(e) => set("google_sheet_tab", e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label>Enable sync</Label>
            <Switch checked={!!s.sync_enabled} onCheckedChange={(v) => set("sync_enabled", v)} />
          </div>
          {s.last_synced_at && (
            <p className="text-xs text-muted-foreground flex items-center gap-1"><RefreshCw className="w-3 h-3" />Last synced: {new Date(s.last_synced_at).toLocaleString()}</p>
          )}
        </section>

        </fieldset>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => save.mutate()} disabled={!form || save.isPending || hasErrors || editLocked}>Save settings</Button>
          {form && <Button variant="outline" onClick={() => setForm(null)}>Discard changes</Button>}
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
        <Label className="block">Live preview (actual size {num("width_in", 2)}in × {num("height_in", 0.5)}in)</Label>
        <div className="rounded-xl border border-border p-6 bg-muted/30 flex items-center justify-center transition-all duration-300 ease-out">
          <div key={currentId ?? "none"} className="transition-all duration-300 ease-out animate-in fade-in zoom-in-95">
            <Sticker data={preview} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Preview renders at the exact configured physical size. Barcodes are generated with bwip-js.</p>

        {warnings.length > 0 && (
          <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/20">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <AlertTriangle className={`w-4 h-4 ${hasErrors ? "text-destructive" : "text-amber-500"}`} />
              Layout checks
            </div>
            <ul className="text-xs space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className={w.level === "error" ? "text-destructive" : "text-amber-600 dark:text-amber-400"}>• {w.message}</li>
              ))}
            </ul>
            {hasErrors && <p className="text-xs text-destructive">Fix errors above before saving.</p>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => setSampleOpen(true)}>
            <Printer className="w-4 h-4 mr-1.5" />Test print sheet
          </Button>
          <Button size="sm" variant="outline" onClick={exportSamplePdf} disabled={exporting}>
            <FileDown className="w-4 h-4 mr-1.5" />{exporting ? "Exporting…" : "Export sample PDF"}
          </Button>
        </div>
      </div>

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Test sheet · {sampleCount} sample stickers</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Print this sheet to verify scaling before running a bulk print job. Set your printer to 100% / Actual Size (no fit-to-page).</p>
          <div ref={sampleRef} className="print-sheet flex flex-wrap gap-2 p-2 bg-white rounded-lg max-h-[60vh] overflow-auto">
            {sampleItems.map((item, i) => <Sticker key={i} data={item} />)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSampleOpen(false)}>Close</Button>
            <Button variant="outline" onClick={exportSamplePdf} disabled={exporting}>
              <FileDown className="w-4 h-4 mr-1.5" />{exporting ? "Exporting…" : "Export PDF"}
            </Button>
            <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
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

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Import sticker presets</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Upload a JSON file exported from another environment, or paste JSON below. Accepts a single preset object or an array.</p>
          <div className="space-y-2">
            <Input type="file" accept="application/json,.json" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              setImportText(text);
            }} />
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{ "name": "My preset", "width_in": 2, ... }'
              className="min-h-[180px] font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={() => parseAndImport(importText)} disabled={!importText.trim() || importMut.isPending}>
              <Upload className="w-4 h-4 mr-1.5" />{importMut.isPending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}

