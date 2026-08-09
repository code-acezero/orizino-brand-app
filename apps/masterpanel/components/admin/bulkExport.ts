"use client";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";

function downloadCsv(data: Record<string, any>[], filename: string) {
  if (!data.length) {
    toast.warning("No data to export");
    return;
  }
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${data.length} rows`);
}

export async function exportCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("name,slug,description,is_active,is_featured,icon,meta_title,meta_description,sort_order,parent_id")
    .order("sort_order");
  if (error) { toast.error("Export failed: " + error.message); return; }
  downloadCsv(data || [], "categories-export.csv");
}

export async function exportProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("name,slug,price,compare_at_price,sku,stock_quantity,description,short_description,is_active,is_featured,tags,thumbnail,meta_title,meta_description,category_id,categories(name)")
    .order("created_at", { ascending: false });
  if (error) { toast.error("Export failed: " + error.message); return; }
  const rows = (data || []).map((p: any) => ({
    name: p.name,
    slug: p.slug,
    price: p.price,
    compare_at_price: p.compare_at_price ?? "",
    category: p.categories?.name ?? "",
    sku: p.sku ?? "",
    stock_quantity: p.stock_quantity,
    description: p.description ?? "",
    short_description: p.short_description ?? "",
    is_active: p.is_active,
    is_featured: p.is_featured,
    tags: (p.tags || []).join(","),
    thumbnail: p.thumbnail ?? "",
    meta_title: p.meta_title ?? "",
    meta_description: p.meta_description ?? "",
  }));
  downloadCsv(rows, "products-export.csv");
}

export async function exportVariants() {
  const { data, error } = await supabase
    .from("product_variants")
    .select("product_id,color,size,sku,stock_quantity,price_override,is_active,image_url,products(slug)")
    .order("product_id");
  if (error) { toast.error("Export failed: " + error.message); return; }
  const rows = (data || []).map((v: any) => ({
    product: v.products?.slug ?? v.product_id,
    color: v.color ?? "",
    size: v.size ?? "",
    sku: v.sku ?? "",
    stock_quantity: v.stock_quantity,
    price_override: v.price_override ?? "",
    is_active: v.is_active,
    image_url: v.image_url ?? "",
  }));
  downloadCsv(rows, "variants-export.csv");
}
// code:4ce0
