"use client";
import React, { useState } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Trash2, ShoppingCart, ArrowRight, Share2, Bell, BellOff,
  Grid3X3, List, Check, ExternalLink, Package, Sparkles, PackagePlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/lib/app-toast";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductCard from "@/components/ProductCard";

const IMGBB_API_KEY = "ba66301b5419800417d1bfa691117307";
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  reviewing: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  sourcing: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  ordered: "bg-primary/10 text-primary border-primary/30",
  delivered: "bg-green-500/10 text-green-600 border-green-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

async function uploadToImgBB(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", file);
  const res = await fetch(IMGBB_UPLOAD_URL, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || "Upload failed");
  return data.data.display_url;
}

const WishlistPage: React.FC = () => {
  useSeoMeta("wishlist", "Wishlist");
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importNotes, setImportNotes] = useState("");
  const [importImages, setImportImages] = useState<string[]>([]);
  const [submittingImport, setSubmittingImport] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlist_items")
        .select("*, products(id, name, price, compare_at_price, thumbnail, slug, stock_quantity, avg_rating, review_count, created_at)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: stockNotifs } = useQuery({
    queryKey: ["stock-notifs", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("stock_notifications").select("product_id").eq("user_id", user!.id).eq("is_notified", false);
      return data?.map((n) => n.product_id) || [];
    },
    enabled: !!user,
  });

  const { data: importRequests } = useQuery({
    queryKey: ["import-requests", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_import_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => { await supabase.from("wishlist_items").delete().eq("id", id); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
      toast({ title: "Item removed from wishlist" });
    },
  });

  const removeImportRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_import_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["import-requests"] });
      toast({ title: "Import request removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to remove import request", description: err.message, variant: "destructive" });
    },
  });

  const addToCart = async (productId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
    if (existing) await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    else await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity: 1 });
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    toast({ title: "Added to cart!" });
  };

  const addAllToCart = async () => {
    if (!user || !items) return;
    const toAdd = selectedItems.length > 0 ? items.filter((i) => selectedItems.includes(i.id)) : items;
    let count = 0;
    for (const item of toAdd) {
      const product = item.products as any;
      if (!product || product.stock_quantity <= 0) continue;
      await addToCart(product.id);
      count++;
    }
    toast({ title: `${count} items added to cart` });
    setSelectedItems([]);
  };

  const removeSelected = async () => {
    for (const id of selectedItems) {
      await supabase.from("wishlist_items").delete().eq("id", id);
    }
    setSelectedItems([]);
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
    toast({ title: "Selected items removed" });
  };

  const toggleNotify = async (productId: string) => {
    if (!user) return;
    const isSubscribed = stockNotifs?.includes(productId);
    if (isSubscribed) {
      await supabase.from("stock_notifications").delete().eq("user_id", user.id).eq("product_id", productId);
      toast({ title: "Restock alert removed" });
    } else {
      await supabase.from("stock_notifications").insert({ user_id: user.id, product_id: productId, email: user.email });
      toast({ title: "You'll be notified when back in stock!" });
    }
    queryClient.invalidateQueries({ queryKey: ["stock-notifs"] });
  };

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const shareWishlist = () => {
    if (navigator.share) {
      navigator.share({ title: "My Wishlist", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Wishlist link copied to clipboard!" });
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !importUrl.trim()) return;
    setSubmittingImport(true);
    try {
      await supabase.from("product_import_requests" as any).insert({
        user_id: user.id,
        product_url: importUrl.trim(),
        notes: importNotes.trim() || null,
        reference_images: (importImages.length > 0 ? importImages : null) as any,
      });
      toast({ title: "Request submitted!", description: "We'll review it and notify you." });
      setImportUrl("");
      setImportNotes("");
      setImportImages([]);
      setImportDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["import-requests"] });
    } catch {
      toast({ title: "Failed to submit request", variant: "destructive" });
    } finally {
      setSubmittingImport(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      for (const file of files) {
        const url = await uploadToImgBB(file);
        setImportImages((prev) => [...prev, url]);
      }
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pb-20 lg:pb-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
            <Heart className="w-7 h-7 fill-primary/30" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-1.5">My Wishlist</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to view your saved products</p>
          <Link to="/auth" className="rounded-full bg-primary text-primary-foreground font-semibold px-7 py-3 text-sm shadow-sm hover:opacity-90 transition-opacity">
            Sign In to Access
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* ── Elegant Header Section ── */}
        {/* ── Header Section — Title & Request Button on same top row ── */}
        <div className="border-b border-border/40 pb-5 space-y-2">
          {/* Top Row: Title + Action Buttons side-by-side on mobile & desktop */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-foreground tracking-tight">
              Wishlist
            </h1>

            {/* Action Buttons — aligned parallel on the same row as title */}
            <div className="flex items-center gap-2.5 shrink-0">
              {items && items.length > 0 && (
                <Button onClick={addAllToCart} className="rounded-2xl gap-2 font-bold text-xs sm:text-sm h-9 sm:h-10 px-3.5 sm:px-5 shadow-xs">
                  <ShoppingCart className="w-4 h-4" /> <span className="hidden sm:inline">Add All to Cart</span><span className="sm:hidden">Add All</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
                className="rounded-2xl gap-2 font-semibold text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 border-border/60"
              >
                <PackagePlus className="w-4 h-4 text-primary" /> Request Product
              </Button>
              <Button variant="outline" onClick={shareWishlist} className="rounded-2xl h-9 sm:h-10 w-9 sm:w-10 p-0 text-foreground border-border/60 hidden sm:flex items-center justify-center" title="Share collection">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary fill-primary/30 shrink-0" />
            <span>{items?.length || 0} items saved in your private collection</span>
          </p>
        </div>

        <Tabs defaultValue="wishlist" className="space-y-6 sm:space-y-8">
          {/* Symmetrical Parallel Control Bar — aligned horizontally on 1 row */}
          <div className="flex items-center justify-between gap-3 sm:gap-4 border-b border-border/40 pb-4">
            {/* Left: Tab Switcher Pills — identical count badge styling */}
            <TabsList className="h-10 p-1 rounded-2xl bg-card/80 border border-border/50 shadow-xs inline-flex items-center shrink-0">
              <TabsTrigger value="wishlist" className="rounded-xl px-3.5 sm:px-5 py-1.5 font-bold text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Saved Items ({items?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="requests" className="rounded-xl px-3.5 sm:px-5 py-1.5 font-bold text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Import Requests ({importRequests?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Right: Parallel View Mode Toggle & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedItems.length > 0 && (
                <Button size="sm" variant="outline" onClick={removeSelected} className="rounded-2xl gap-1.5 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 font-semibold h-10 px-3">
                  <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedItems.length})
                </Button>
              )}
              <div className="h-10 flex items-center rounded-2xl border border-border/50 overflow-hidden bg-card/80 p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                    viewMode === "grid" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grid View"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                    viewMode === "list" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Tab 1: Saved Items Grid / List ── */}
          <TabsContent value="wishlist" className="space-y-6">
            {isLoading ? (
              <div className={`${viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6" : "space-y-4"}`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="rounded-2xl border border-border/50 bg-card/60 p-6 h-64 animate-pulse" />
                ))}
              </div>
            ) : !items || items.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-border/40 bg-card/30 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
                  <Heart className="w-7 h-7 fill-primary/20" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Your Wishlist is Empty</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Save products as you browse to keep track of items you love.
                </p>
                <Link to="/inventory" className="rounded-full bg-primary text-primary-foreground font-bold px-8 py-3 text-sm inline-flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
                  Browse Products <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                <AnimatePresence>
                  {items.map((item) => {
                    const product = item.products as any;
                    if (!product) return null;
                    const isSelected = selectedItems.includes(item.id);

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative group flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-md"
                      >
                        {/* Select checkbox overlay */}
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(item.id); }}
                          className={`absolute top-3 left-3 z-30 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border/80 bg-background/80 backdrop-blur-xs opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>

                        {/* Direct Trash Delete Button overlay */}
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeItem.mutate(item.id); }}
                          aria-label="Remove item"
                          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-background/80 backdrop-blur-xs border border-border/40 text-muted-foreground hover:text-destructive hover:bg-destructive/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xs"
                          title="Remove from wishlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Main Product Card */}
                        <ProductCard
                          id={product.id}
                          name={product.name}
                          price={product.price}
                          compareAtPrice={product.compare_at_price}
                          thumbnail={product.thumbnail}
                          avgRating={product.avg_rating}
                          reviewCount={product.review_count}
                          slug={product.slug}
                          createdAt={product.created_at}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              /* List View — 100% full width */
              <div className="space-y-3 w-full">
                <AnimatePresence>
                  {items.map((item) => {
                    const product = item.products as any;
                    if (!product) return null;
                    const outOfStock = product.stock_quantity <= 0;
                    const isSelected = selectedItems.includes(item.id);

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className={`rounded-2xl border border-border/50 bg-card/80 p-4 flex gap-4 items-center hover:border-primary/40 shadow-xs transition-all ${
                          outOfStock ? "opacity-75" : ""
                        }`}
                      >
                        <button onClick={() => toggleSelect(item.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <Link to={`/product/${product.slug}`} className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-secondary/10">
                          <img src={product.thumbnail || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/product/${product.slug}`} className="font-semibold text-sm sm:text-base text-foreground hover:text-primary line-clamp-1">{product.name}</Link>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-base font-bold text-foreground">{formatPrice(product.price)}</span>
                            {product.compare_at_price && <span className="text-xs text-muted-foreground line-through font-medium">{formatPrice(product.compare_at_price)}</span>}
                          </div>
                          {outOfStock && <Badge variant="destructive" className="mt-1 text-[10px]">Out of Stock</Badge>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {outOfStock ? (
                            <Button size="sm" variant="outline" onClick={() => toggleNotify(product.id)} className="rounded-xl font-semibold">
                              {stockNotifs?.includes(product.id) ? <BellOff className="w-4 h-4 text-primary" /> : <Bell className="w-4 h-4 text-primary" />}
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => addToCart(product.id)} className="rounded-xl font-bold gap-1.5 shadow-xs">
                              <ShoppingCart className="w-4 h-4" /> Add to Cart
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => removeItem.mutate(item.id)} className="rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* ── Tab 2: Redesigned Product Import Requests Panel ── */}
          <TabsContent value="requests" className="space-y-6 w-full">
            {/* Redesigned Sourcing Input Bar */}
            <div className="p-5 sm:p-6 rounded-3xl border border-border/50 bg-card/80 shadow-xs space-y-3 w-full">
              <div>
                <h2 className="text-base sm:text-lg font-bold font-display text-foreground flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-primary shrink-0" />
                  Import Global Products
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paste link from Amazon, Flipkart, Nike, or any global store — we will source & deliver it to you.
                </p>
              </div>

              <form onSubmit={handleImportSubmit} className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <div className="relative flex-1 w-full">
                  <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="Paste URL (e.g. https://www.amazon.com/dp/B0...)"
                    required
                    className="pl-10 h-11 rounded-2xl border-border/60 bg-background/80 text-xs sm:text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submittingImport}
                  className="w-full sm:w-auto h-11 px-6 rounded-2xl font-bold gap-2 text-xs sm:text-sm shadow-xs shrink-0"
                >
                  {submittingImport ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </div>

            {/* Import Requests List */}
            {!importRequests || importRequests.length === 0 ? (
              <div className="rounded-3xl border border-border/50 bg-card/40 p-10 text-center w-full">
                <Package className="w-12 h-12 text-primary/40 mx-auto mb-3" />
                <p className="text-base font-bold text-foreground mb-1">No import requests yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Paste any product URL from global retailers in the box above to get instant pricing & delivery.
                </p>
              </div>
            ) : (
              <div className="space-y-3 w-full">
                {importRequests.map((req: any) => {
                  let host = "";
                  try {
                    host = new URL(req.product_url).hostname.replace("www.", "");
                  } catch {
                    host = "Global Store";
                  }

                  return (
                    <div
                      key={req.id}
                      className="rounded-2xl border border-border/50 bg-card/80 p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-all w-full space-y-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0 pr-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                              {host}
                            </span>
                          </div>
                          <a
                            href={req.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                          >
                            <span className="truncate">{req.product_url}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          </a>
                          {req.notes && <p className="text-xs text-muted-foreground">{req.notes}</p>}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${statusColors[req.status] || ""}`}>
                            {req.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeImportRequest.mutate(req.id)}
                            disabled={removeImportRequest.isPending}
                            className="w-8 h-8 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition-colors"
                            title="Delete request"
                            aria-label="Delete request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Import Request Modal */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="rounded-3xl max-w-lg border border-border/60 bg-background/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" /> Request Product Import
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Product URL *</Label>
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://amazon.com/dp/..."
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Notes / Details</Label>
              <Input
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
                placeholder="Size, color, quantity..."
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Reference Images</Label>
              <Input type="file" accept="image/*" multiple onChange={handleImageUpload} className="rounded-xl text-xs" />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={submittingImport} className="rounded-xl font-bold">
                {submittingImport ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WishlistPage;
// code:4ce0
