"use client";
import React, { useState } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Trash2,
  ShoppingCart,
  ArrowRight,
  Share2,
  Bell,
  BellOff,
  Grid3X3,
  List,
  Check,
  Package,
  Search,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/lib/app-toast";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";

const WishlistPage: React.FC = () => {
  useSeoMeta("wishlist", "My Wishlist");
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");

  const { data: items = [], isLoading } = useQuery({
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

  const { data: stockNotifs = [] } = useQuery({
    queryKey: ["stock-notifs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_notifications")
        .select("product_id")
        .eq("user_id", user!.id)
        .eq("is_notified", false);
      return data?.map((n) => n.product_id) || [];
    },
    enabled: !!user,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("wishlist_items").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
      toast({ title: "Item removed from wishlist" });
    },
  });

  const addToCart = async (productId: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity: 1 });
    }
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    toast({ title: "Added to cart!" });
  };

  const addAllInStockToCart = async () => {
    if (!user || items.length === 0) return;
    const targetItems =
      selectedItems.length > 0 ? items.filter((i) => selectedItems.includes(i.id)) : items;

    let count = 0;
    for (const item of targetItems) {
      const product = item.products as any;
      if (!product || product.stock_quantity <= 0) continue;
      await addToCart(product.id);
      count++;
    }

    if (count > 0) {
      toast({ title: `${count} item${count > 1 ? "s" : ""} added to your bag` });
      setSelectedItems([]);
    } else {
      toast({ title: "No in-stock items available to add", variant: "destructive" });
    }
  };

  const removeSelected = async () => {
    if (selectedItems.length === 0) return;
    for (const id of selectedItems) {
      await supabase.from("wishlist_items").delete().eq("id", id);
    }
    setSelectedItems([]);
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
    toast({ title: "Selected items removed" });
  };

  const clearAllWishlist = async () => {
    if (!user || items.length === 0) return;
    if (!confirm("Are you sure you want to clear your entire wishlist?")) return;
    await supabase.from("wishlist_items").delete().eq("user_id", user.id);
    setSelectedItems([]);
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
    toast({ title: "Wishlist cleared" });
  };

  const toggleNotify = async (productId: string) => {
    if (!user) return;
    const isSubscribed = stockNotifs.includes(productId);
    if (isSubscribed) {
      await supabase.from("stock_notifications").delete().eq("user_id", user.id).eq("product_id", productId);
      toast({ title: "Restock alert removed" });
    } else {
      await supabase.from("stock_notifications").insert({
        user_id: user.id,
        product_id: productId,
        email: user.email,
      });
      toast({ title: "You'll be notified when back in stock!" });
    }
    queryClient.invalidateQueries({ queryKey: ["stock-notifs"] });
  };

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map((i) => i.id));
    }
  };

  const shareWishlist = () => {
    if (navigator.share) {
      navigator.share({ title: "My Wishlist | Orizino", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Wishlist link copied to clipboard!" });
    }
  };

  // Filter items by search and stock
  const filteredItems = items.filter((item) => {
    const product = item.products as any;
    if (!product) return false;
    const matchesSearch =
      !searchQuery.trim() ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase().trim());

    const isOutOfStock = product.stock_quantity <= 0;
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in_stock" && !isOutOfStock) ||
      (stockFilter === "out_of_stock" && isOutOfStock);

    return matchesSearch && matchesStock;
  });

  const inStockCount = items.filter((i) => {
    const p = i.products as any;
    return p && p.stock_quantity > 0;
  }).length;

  if (!user) {
    return (
      <div className="min-h-[70vh] w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full text-center space-y-5 p-8 sm:p-16 md:p-20 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
            <Heart className="w-8 h-8 fill-primary/30 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-bold font-display text-foreground tracking-tight">
              Your Wishlist
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
              Sign in to your account to view and synchronize your saved items across devices.
            </p>
          </div>
          <div className="pt-3">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold px-8 sm:px-10 py-3.5 text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign In to View Wishlist
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-12">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* ── Luxury Header ── */}
        <div className="border-b border-border/40 pb-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-foreground tracking-tight">
                  My Wishlist
                </h1>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 rounded-full">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                <span>Your curated collection of favorite pieces and luxury essentials.</span>
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {inStockCount > 0 && (
                <Button
                  onClick={addAllInStockToCart}
                  className="rounded-2xl gap-2 font-bold text-xs sm:text-sm h-10 px-5  bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add In-Stock to Bag ({inStockCount})</span>
                </Button>
              )}

              <Button
                variant="outline"
                onClick={shareWishlist}
                className="rounded-2xl h-10 px-3.5 gap-2 text-xs sm:text-sm font-semibold border-border/60"
                title="Share collection"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>

              {items.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={clearAllWishlist}
                  className="rounded-2xl h-10 px-3 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Clear wishlist"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Wishlist Content ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card/60 p-6 h-72 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="text-center py-24 px-4 rounded-3xl border border-border/40 bg-card/40 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Heart className="w-8 h-8 fill-primary/20" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-display text-foreground">Your Wishlist is Empty</h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                Explore our catalog and click the heart icon on products you adore to keep them saved here.
              </p>
            </div>
            <div className="pt-3">
              <Link
                to="/inventory"
                className="rounded-full bg-primary text-primary-foreground font-bold px-8 py-3.5 text-sm inline-flex items-center gap-2  hover:opacity-95 transition-opacity"
              >
                <span>Explore Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filter & View Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-card/80 border border-border/50 ">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter saved items..."
                    className="pl-8.5 h-8.5 text-xs rounded-xl border-border/60 bg-background/60"
                  />
                </div>

                {/* Stock filter chips */}
                <div className="hidden md:flex items-center gap-1 bg-secondary/50 p-0.5 rounded-full sm:rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setStockFilter("all")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      stockFilter === "all" ? "bg-background font-bold text-foreground " : "text-muted-foreground"
                    }`}
                  >
                    All ({items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilter("in_stock")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      stockFilter === "in_stock" ? "bg-background font-bold text-foreground " : "text-muted-foreground"
                    }`}
                  >
                    In Stock ({inStockCount})
                  </button>
                  {items.length - inStockCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setStockFilter("out_of_stock")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        stockFilter === "out_of_stock" ? "bg-background font-bold text-foreground " : "text-muted-foreground"
                      }`}
                    >
                      Out of Stock ({items.length - inStockCount})
                    </button>
                  )}
                </div>
              </div>

              {/* View toggle & bulk actions */}
              <div className="flex items-center justify-between sm:justify-end gap-2">
                {selectedItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={addAllInStockToCart}
                      className="rounded-xl h-8 text-xs font-semibold gap-1 bg-primary text-primary-foreground"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Add Selected</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={removeSelected}
                      className="rounded-xl h-8 text-xs font-semibold gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove ({selectedItems.length})</span>
                    </Button>
                  </div>
                )}

                <div className="h-8.5 flex items-center rounded-xl border border-border/50 overflow-hidden bg-background p-0.5 ">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`h-7.5 w-7.5 rounded-lg flex items-center justify-center transition-all ${
                      viewMode === "grid" ? "bg-primary text-primary-foreground font-bold " : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Grid View"
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`h-7.5 w-7.5 rounded-lg flex items-center justify-center transition-all ${
                      viewMode === "list" ? "bg-primary text-primary-foreground font-bold " : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Grid View ── */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                <AnimatePresence>
                  {filteredItems.map((item) => {
                    const product = item.products as any;
                    if (!product) return null;
                    const isSelected = selectedItems.includes(item.id);
                    const isOutOfStock = product.stock_quantity <= 0;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative group flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:border-primary/40 hover:"
                      >
                        {/* Select checkbox overlay */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSelect(item.id);
                          }}
                          className={`absolute top-3 left-3 z-30 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border/80 bg-background/80 backdrop-blur-xs opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>

                        {/* Direct Trash Delete Button overlay */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeItem.mutate(item.id);
                          }}
                          aria-label="Remove item"
                          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-background/80 backdrop-blur-xs border border-border/40 text-muted-foreground hover:text-destructive hover:bg-destructive/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all "
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

                        {/* In-Stock Action Footer */}
                        <div className="p-3 border-t border-border/40 bg-card/60 flex items-center justify-between gap-2 mt-auto">
                          {isOutOfStock ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleNotify(product.id)}
                              className="w-full text-xs font-semibold rounded-xl h-8 gap-1.5 border-border/60"
                            >
                              {stockNotifs.includes(product.id) ? (
                                <>
                                  <BellOff className="w-3.5 h-3.5 text-primary" />
                                  <span>Alert Active</span>
                                </>
                              ) : (
                                <>
                                  <Bell className="w-3.5 h-3.5" />
                                  <span>Notify Me</span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addToCart(product.id)}
                              className="w-full text-xs font-bold rounded-xl h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 "
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Add to Bag</span>
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              /* ── List View ── */
              <div className="space-y-3 w-full">
                <AnimatePresence>
                  {filteredItems.map((item) => {
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
                        className={`rounded-2xl border border-border/50 bg-card/80 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:border-primary/40  transition-all ${
                          outOfStock ? "opacity-85" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <button
                            onClick={() => toggleSelect(item.id)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>

                          <Link
                            to={`/product/${product.slug}`}
                            className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-secondary/20 border border-border/40"
                          >
                            <img
                              src={product.thumbnail || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </Link>

                          <div className="min-w-0 flex-1 space-y-1">
                            <Link
                              to={`/product/${product.slug}`}
                              className="font-semibold text-sm sm:text-base text-foreground hover:text-primary transition-colors line-clamp-1"
                            >
                              {product.name}
                            </Link>

                            <div className="flex items-baseline gap-2">
                              <span className="text-sm sm:text-base font-bold text-foreground">
                                {formatPrice(product.price)}
                              </span>
                              {product.compare_at_price && (
                                <span className="text-xs text-muted-foreground line-through font-medium">
                                  {formatPrice(product.compare_at_price)}
                                </span>
                              )}
                              {outOfStock && (
                                <Badge variant="destructive" className="text-[10px] px-2 py-0">
                                  Out of Stock
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {outOfStock ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleNotify(product.id)}
                              className="rounded-full sm:rounded-xl text-xs font-semibold h-9 gap-1.5"
                            >
                              {stockNotifs.includes(product.id) ? (
                                <>
                                  <BellOff className="w-3.5 h-3.5 text-primary" />
                                  <span>Alert Active</span>
                                </>
                              ) : (
                                <>
                                  <Bell className="w-3.5 h-3.5" />
                                  <span>Notify Me</span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addToCart(product.id)}
                              className="rounded-full sm:rounded-xl text-xs font-bold h-9 px-4 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 "
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Add to Bag</span>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem.mutate(item.id)}
                            className="rounded-xl h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remove from wishlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default WishlistPage;
