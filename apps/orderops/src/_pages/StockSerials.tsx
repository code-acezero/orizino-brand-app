import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Badge } from "@ui/components/ui/badge";
import { toast } from "sonner";
import {
  Layers,
  Search,
  PackageCheck,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Barcode,
  Package,
  Boxes,
  ArrowUpDown,
  Tag,
} from "lucide-react";
import { format } from "date-fns";

type TabMode = "products" | "serials";

interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  is_active: boolean;
  product_variants?: any[];
}

export function StockSerials() {
  const [tab, setTab] = useState<TabMode>("products");
  const [search, setSearch] = useState("");
  const [serialFilter, setSerialFilter] = useState<string>("all");

  // Fetch product inventory
  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useQuery<ProductItem[]>({
    queryKey: ["orderops-stock-products"],
    queryFn: async () => {
      const { data, error } = (await (supabase.from as any)("products")
        .select(`
          id, name, sku, price, stock, is_active,
          product_variants ( id, title, sku, stock, price )
        `)
        .order("name", { ascending: true })) as { data: any; error: any };
      if (error) {
        toast.error("Failed to load product stock");
        return [];
      }
      return data || [];
    },
  });

  // Fetch serial numbers ledger
  const { data: serials = [], isLoading: loadingSerials, refetch: refetchSerials } = useQuery<any[]>({
    queryKey: ["orderops-stock-serials", serialFilter],
    queryFn: async () => {
      let query = (supabase.from as any)("product_serials")
        .select(`
          id, serial_number, status, created_at, sold_at, order_id,
          products:product_id ( id, name, sku )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (serialFilter !== "all") {
        query = query.eq("status", serialFilter);
      }

      const { data, error } = await query;
      if (error) {
        toast.error("Failed to load serial numbers");
        return [];
      }
      return data || [];
    },
  });

  const totals = {
    totalProducts: products.length,
    totalStock: products.reduce((acc, p) => acc + (p.stock || 0), 0),
    lowStock: products.filter((p) => (p.stock || 0) < 5).length,
    availableSerials: serials.filter((s: any) => s.status === "available").length,
  };

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  });

  const filteredSerials = serials.filter((s: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.serial_number.toLowerCase().includes(q) ||
      (s.products?.name && s.products.name.toLowerCase().includes(q)) ||
      (s.products?.sku && s.products.sku.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 pt-1 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>Stock & Serials</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Realtime inventory counts, variant matrix & unit serial tracking
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchProducts();
            refetchSerials();
          }}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sync</span>
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Boxes className="w-3.5 h-3.5 text-primary" />
            <span>Total SKUs</span>
          </div>
          <p className="text-lg font-bold text-foreground leading-tight">
            {totals.totalProducts}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Package className="w-3.5 h-3.5 text-emerald-500" />
            <span>Units In Stock</span>
          </div>
          <p className="text-lg font-bold text-foreground leading-tight">
            {totals.totalStock.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Low Stock Items</span>
          </div>
          <p className="text-lg font-bold text-amber-500 leading-tight">
            {totals.lowStock}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Barcode className="w-3.5 h-3.5 text-blue-500" />
            <span>Tracked Serials</span>
          </div>
          <p className="text-lg font-bold text-foreground leading-tight">
            {serials.length}
          </p>
        </div>
      </div>

      {/* View Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="inline-flex p-1 bg-secondary/40 border border-border/70 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab("products")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === "products"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Product Stock ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("serials")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tab === "serials"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Serial Ledger ({serials.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "products"
                ? "Search product name or SKU…"
                : "Search serial barcode, product or SKU…"
            }
            className="h-10 rounded-2xl pl-10 text-xs bg-card/70 border-border/70"
          />
        </div>
      </div>

      {/* Tab 1: Product Stock Matrix */}
      {tab === "products" && (
        <div className="space-y-2.5">
          {loadingProducts && (
            <p className="text-center py-10 text-xs text-muted-foreground">Loading products…</p>
          )}
          {!loadingProducts && filteredProducts.length === 0 && (
            <div className="text-center py-10 border border-border/60 rounded-3xl bg-card/40 text-xs text-muted-foreground">
              No products found
            </div>
          )}
          {filteredProducts.map((p) => {
            const hasVariants = p.product_variants && p.product_variants.length > 0;
            const isLow = (p.stock || 0) < 5;
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-border/70 bg-card/70 p-3.5 shadow-2xs hover:bg-card hover:border-border transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {p.name}
                      </h3>
                      {isLow && (
                        <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/20 text-[9px] px-1.5 py-0">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      SKU: {p.sku || "N/A"} · ৳{Number(p.price).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        (p.stock || 0) > 10
                          ? "bg-emerald-500/15 text-emerald-500"
                          : isLow
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.stock ?? 0} in stock
                    </span>
                  </div>
                </div>

                {/* Variant Stock Breakdown */}
                {hasVariants && (
                  <div className="mt-2.5 pt-2.5 border-t border-border/40 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {p.product_variants?.map((v: any) => (
                      <div
                        key={v.id}
                        className="rounded-xl bg-secondary/40 px-2.5 py-1.5 flex items-center justify-between text-[11px]"
                      >
                        <span className="text-muted-foreground truncate">{v.title}</span>
                        <span className="font-bold text-foreground ml-2">{v.stock ?? 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Serials Ledger */}
      {tab === "serials" && (
        <div className="space-y-2.5">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {["all", "available", "sold", "returned", "defective"].map((s) => (
              <button
                key={s}
                onClick={() => setSerialFilter(s)}
                className={`text-[11px] px-3 py-1 rounded-full font-semibold capitalize shrink-0 transition-colors ${
                  serialFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {loadingSerials && (
            <p className="text-center py-10 text-xs text-muted-foreground">Loading serials…</p>
          )}
          {!loadingSerials && filteredSerials.length === 0 && (
            <div className="text-center py-10 border border-border/60 rounded-3xl bg-card/40 text-xs text-muted-foreground">
              No serial numbers match this filter
            </div>
          )}
          {filteredSerials.map((s: any) => (
            <div
              key={s.id}
              className="rounded-2xl border border-border/70 bg-card/70 px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Barcode className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-mono font-bold text-foreground truncate">
                    {s.serial_number}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {s.products?.name ?? "Unknown product"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${
                    s.status === "available"
                      ? "bg-emerald-500/15 text-emerald-500"
                      : s.status === "sold"
                      ? "bg-blue-500/15 text-blue-500"
                      : s.status === "returned"
                      ? "bg-amber-500/15 text-amber-500"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {s.status}
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  {format(new Date(s.created_at), "MMM d")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
