"use client";
import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Link2, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type BulkUploadMode = "categories" | "products" | "variants";

interface BulkUploadProps {
  mode: BulkUploadMode;
  onComplete: () => void;
  categories?: { id: string; name: string; slug: string }[];
  products?: { id: string; name: string; slug: string }[];
}

type RowStatus = "valid" | "error" | "warning";

interface ParsedRow {
  data: Record<string, string>;
  status: RowStatus;
  errors: string[];
}

const CATEGORY_REQUIRED = ["name", "slug"];
const PRODUCT_REQUIRED = ["name", "slug", "price"];
const VARIANT_REQUIRED = ["product", "stock_quantity"];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function normalizeHeaders(headers: string[]): string[] {
  return headers.map((h) =>
    h.trim().toLowerCase().replace(/[\s_]+/g, "_").replace(/[^a-z0-9_]/g, "")
  );
}

function parseSheetToRows(rawRows: string[][]): Record<string, string>[] {
  if (rawRows.length < 2) return [];
  const headers = normalizeHeaders(rawRows[0]);
  return rawRows.slice(1).filter(r => r.some(c => c?.trim())).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (row[i] ?? "").trim(); });
    return obj;
  });
}

function validateRow(row: Record<string, string>, mode: BulkUploadMode, products?: { id: string; name: string; slug: string }[]): { status: RowStatus; errors: string[] } {
  const errors: string[] = [];
  const required = mode === "categories" ? CATEGORY_REQUIRED : mode === "products" ? PRODUCT_REQUIRED : VARIANT_REQUIRED;
  required.forEach((f) => {
    if (!row[f]?.trim()) errors.push(`Missing "${f}"`);
  });
  if (mode === "products" && row.price && isNaN(Number(row.price))) {
    errors.push("Invalid price");
  }
  if ((mode === "products" || mode === "variants") && row.stock_quantity && isNaN(Number(row.stock_quantity))) {
    errors.push("Invalid stock_quantity");
  }
  if (mode === "variants") {
    if (row.price_override && isNaN(Number(row.price_override))) errors.push("Invalid price_override");
    if (row.product && products?.length) {
      const match = products.find(p => p.name.toLowerCase() === row.product.toLowerCase() || p.slug === row.product.toLowerCase());
      if (!match) errors.push(`Product "${row.product}" not found`);
    }
  }
  return { status: errors.length ? "error" : "valid", errors };
}

function buildCategoryInsert(row: Record<string, string>) {
  return {
    name: row.name,
    slug: row.slug || slugify(row.name),
    description: row.description || null,
    is_active: row.is_active?.toLowerCase() !== "false",
    is_featured: row.is_featured?.toLowerCase() === "true",
    meta_title: row.meta_title || null,
    meta_description: row.meta_description || null,
    icon: row.icon || null,
  };
}

function buildProductInsert(row: Record<string, string>, categories?: { id: string; name: string; slug: string }[]) {
  let categoryId: string | null = null;
  if (row.category && categories?.length) {
    const match = categories.find(
      (c) => c.name.toLowerCase() === row.category.toLowerCase() || c.slug === row.category.toLowerCase()
    );
    if (match) categoryId = match.id;
  }
  return {
    name: row.name,
    slug: row.slug || slugify(row.name),
    price: Number(row.price) || 0,
    compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
    description: row.description || null,
    short_description: row.short_description || null,
    sku: row.sku || null,
    stock_quantity: Number(row.stock_quantity) || 0,
    is_active: row.is_active?.toLowerCase() !== "false",
    is_featured: row.is_featured?.toLowerCase() === "true",
    category_id: categoryId,
    tags: row.tags ? row.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
    meta_title: row.meta_title || null,
    meta_description: row.meta_description || null,
    thumbnail: row.thumbnail || null,
  };
}

function buildVariantInsert(row: Record<string, string>, products?: { id: string; name: string; slug: string }[]) {
  let productId = "";
  if (row.product && products?.length) {
    const match = products.find(p => p.name.toLowerCase() === row.product.toLowerCase() || p.slug === row.product.toLowerCase());
    if (match) productId = match.id;
  }
  return {
    product_id: productId,
    color: row.color || null,
    size: row.size || null,
    sku: row.sku || null,
    stock_quantity: Number(row.stock_quantity) || 0,
    price_override: row.price_override ? Number(row.price_override) : null,
    is_active: row.is_active?.toLowerCase() !== "false",
    image_url: row.image_url || null,
  };
}

const SAMPLE_CATEGORIES = `name,slug,description,is_active,is_featured
Electronics,electronics,Electronic gadgets,true,true
Fashion,fashion,Clothing and accessories,true,false`;

const SAMPLE_PRODUCTS = `name,slug,price,compare_at_price,category,sku,stock_quantity,description,is_active,is_featured,tags
Sample Product,sample-product,29.99,39.99,Electronics,SKU001,100,A great product,true,false,"tag1,tag2"`;

const SAMPLE_VARIANTS = `product,color,size,sku,stock_quantity,price_override,is_active
sample-product,Black,M,SKU001-BK-M,50,29.99,true
sample-product,White,L,SKU001-WH-L,30,,true`;

export default function BulkUpload({ mode, onComplete, categories, products }: BulkUploadProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [loadingSheet, setLoadingSheet] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setRows([]); setSheetUrl(""); };

  const processRawRows = useCallback((rawRows: Record<string, string>[]) => {
    const parsed: ParsedRow[] = rawRows.map((data) => {
      const { status, errors } = validateRow(data, mode, products);
      return { data, status, errors };
    });
    setRows(parsed);
    if (!parsed.length) toast.warning("No data rows found");
  }, [mode]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim().toLowerCase().replace(/[\s_]+/g, "_").replace(/[^a-z0-9_]/g, ""),
        complete: (result) => processRawRows(result.data as Record<string, string>[]),
        error: () => toast.error("Failed to parse CSV"),
      });
    } else if (["xls", "xlsx"].includes(ext || "")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target?.result, { type: "binary" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const raw: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          processRawRows(parseSheetToRows(raw));
        } catch { toast.error("Failed to parse Excel file"); }
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error("Unsupported file type. Use CSV, XLS, or XLSX.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleGoogleSheet = async () => {
    if (!sheetUrl.trim()) return;
    setLoadingSheet(true);
    try {
      // Convert Google Sheet URL to CSV export
      let csvUrl = "";
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) throw new Error("Invalid Google Sheets URL");
      const sheetId = match[1];
      // Check for gid
      const gidMatch = sheetUrl.match(/gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Could not fetch sheet. Make sure it's publicly accessible.");
      const text = await res.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim().toLowerCase().replace(/[\s_]+/g, "_").replace(/[^a-z0-9_]/g, ""),
        complete: (result) => processRawRows(result.data as Record<string, string>[]),
        error: () => toast.error("Failed to parse sheet data"),
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to load Google Sheet");
    } finally {
      setLoadingSheet(false);
    }
  };

  const validRows = rows.filter((r) => r.status === "valid");
  const errorRows = rows.filter((r) => r.status === "error");

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    try {
      if (mode === "categories") {
        const inserts = validRows.map((r) => buildCategoryInsert(r.data));
        const { error } = await supabase.from("categories").upsert(inserts, { onConflict: "slug" });
        if (error) throw error;
      } else if (mode === "products") {
        const inserts = validRows.map((r) => buildProductInsert(r.data, categories));
        const { error } = await supabase.from("products").upsert(inserts, { onConflict: "slug" });
        if (error) throw error;
      } else {
        const inserts = validRows.map((r) => buildVariantInsert(r.data, products)).filter(v => v.product_id);
        const { error } = await supabase.from("product_variants").upsert(inserts, { onConflict: "product_id,size,color", ignoreDuplicates: false } as any);
        if (error) throw error;
      }
      toast.success(`${validRows.length} ${mode} imported/updated successfully!`);
      reset();
      setOpen(false);
      onComplete();
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadSample = () => {
    const sample = mode === "categories" ? SAMPLE_CATEGORIES : mode === "products" ? SAMPLE_PRODUCTS : SAMPLE_VARIANTS;
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample-${mode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const headers = rows.length ? Object.keys(rows[0].data) : [];

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setOpen(true); }} className="gap-2">
        <Upload className="w-4 h-4" /> {mode === "variants" ? "Upload Variants" : "Bulk Upload"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Bulk Upload {mode === "categories" ? "Categories" : mode === "products" ? "Products" : "Variants"}
            </DialogTitle>
          </DialogHeader>

          {!rows.length ? (
            <div className="space-y-6 py-4">
              <Tabs defaultValue="file">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file">File Upload</TabsTrigger>
                  <TabsTrigger value="gsheet">Google Sheet</TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="space-y-4 mt-4">
                  <div
                    className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/60 transition-colors cursor-pointer"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="w-10 h-10 mx-auto text-primary/60 mb-3" />
                    <p className="text-sm font-medium text-foreground">Click to upload CSV, XLS, or XLSX</p>
                    <p className="text-xs text-muted-foreground mt-1">or drag and drop your file here</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFile} />
                </TabsContent>

                <TabsContent value="gsheet" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Paste a <strong>public</strong> Google Sheets URL. Make sure the sheet is shared as "Anyone with the link can view".
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleGoogleSheet} disabled={loadingSheet || !sheetUrl.trim()} className="gap-2">
                      {loadingSheet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                      Load
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={downloadSample} className="text-xs gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Download Sample CSV
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Required columns: <strong>{mode === "categories" ? "name, slug" : mode === "products" ? "name, slug, price" : "product, stock_quantity"}</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              {/* Summary */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="gap-1.5">
                  {rows.length} rows total
                </Badge>
                <Badge className="gap-1.5 bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="w-3 h-3" /> {validRows.length} valid
                </Badge>
                {errorRows.length > 0 && (
                  <Badge className="gap-1.5 bg-destructive/20 text-destructive border-destructive/30">
                    <XCircle className="w-3 h-3" /> {errorRows.length} errors
                  </Badge>
                )}
              </div>

              {/* Preview table */}
              <ScrollArea className="flex-1 max-h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Status</TableHead>
                      {headers.slice(0, 6).map((h) => (
                        <TableHead key={h} className="text-xs">{h}</TableHead>
                      ))}
                      {headers.length > 6 && <TableHead className="text-xs">+{headers.length - 6} more</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 100).map((row, i) => (
                      <TableRow key={i} className={row.status === "error" ? "bg-destructive/5" : ""}>
                        <TableCell>
                          {row.status === "valid" ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                              <span className="text-[10px] text-destructive">{row.errors[0]}</span>
                            </span>
                          )}
                        </TableCell>
                        {headers.slice(0, 6).map((h) => (
                          <TableCell key={h} className="text-xs max-w-[150px] truncate">{row.data[h]}</TableCell>
                        ))}
                        {headers.length > 6 && <TableCell className="text-xs text-muted-foreground">…</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 100 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Showing first 100 of {rows.length} rows</p>
                )}
              </ScrollArea>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end pt-2 border-t border-border">
                <Button variant="ghost" onClick={reset}>Back</Button>
                <Button onClick={handleImport} disabled={!validRows.length || importing} className="gap-2">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Import / Update {validRows.length} {mode}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
// code:4ce0
