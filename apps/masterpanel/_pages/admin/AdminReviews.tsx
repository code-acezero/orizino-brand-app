"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Check,
  X,
  Trash2,
  Star,
  Image as ImageIcon,
  CheckCheck,
  XCircle,
  MessageSquare,
  Search,
  Package,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Camera,
  Layers,
  RotateCcw,
  SlidersHorizontal,
  ThumbsUp,
  Maximize2,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
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
import { toast } from "@/lib/app-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface ProductRef {
  id?: string;
  name?: string;
  thumbnail?: string | null;
  images?: string[] | null;
  slug?: string;
}

interface ReviewItem {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[] | null;
  is_approved: boolean;
  created_at: string;
  products?: ProductRef | null;
}

interface LightboxState {
  images: string[];
  index: number;
}

const AdminReviews: React.FC = () => {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "with-images">("all");
  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") {
        setLightbox((prev) =>
          prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null
        );
      }
      if (e.key === "ArrowRight") {
        setLightbox((prev) =>
          prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox]);

  // Fetch reviews with joined product metadata
  const { data: reviews = [], isLoading } = useQuery<ReviewItem[]>({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, products(id, name, thumbnail, images, slug)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ReviewItem[];
    },
  });

  // Toggle single review approval status
  const toggleApproval = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_approved: approved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success(approved ? "Review approved and visible to customers" : "Review set to pending / hidden");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete single review
  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review deleted permanently");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Bulk actions mutation
  const bulkAction = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "approve" | "reject" | "delete" }) => {
      if (action === "delete") {
        const { error } = await supabase.from("reviews").delete().in("id", ids);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").update({ is_approved: action === "approve" }).in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: (_, { ids, action }) => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      setSelected(new Set());
      toast.success(
        `${ids.length} review${ids.length > 1 ? "s" : ""} ${
          action === "delete" ? "deleted" : action === "approve" ? "approved" : "rejected"
        }`
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  // KPI calculations
  const totalCount = reviews.length;
  const approvedCount = reviews.filter((r) => r.is_approved).length;
  const pendingCount = reviews.filter((r) => !r.is_approved).length;
  const withImagesCount = reviews.filter((r) => r.images && r.images.length > 0).length;

  const averageRating = useMemo(() => {
    if (!reviews.length) return "0.0";
    const sum = reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  // Filtering & search
  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      // Status filter
      if (filterStatus === "approved" && !r.is_approved) return false;
      if (filterStatus === "pending" && r.is_approved) return false;
      if (filterStatus === "with-images" && (!r.images || r.images.length === 0)) return false;

      // Star rating filter
      if (starFilter !== "all" && r.rating !== starFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const productName = r.products?.name?.toLowerCase() || "";
        const title = r.title?.toLowerCase() || "";
        const comment = r.comment?.toLowerCase() || "";
        if (!productName.includes(q) && !title.includes(q) && !comment.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [reviews, filterStatus, starFilter, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0;

  const hasActiveFilters = filterStatus !== "all" || starFilter !== "all" || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setFilterStatus("all");
    setStarFilter("all");
    setSearchQuery("");
    setSelected(new Set());
  };

  const getProductImage = (r: ReviewItem) => {
    if (r.products?.thumbnail) return r.products.thumbnail;
    if (r.products?.images && r.products.images.length > 0) return r.products.images[0];
    return null;
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-5 pb-20">
      {/* ── 1. Page Header ── */}
      <PageHeader
        icon={<MessageSquare className="w-5 h-5 text-primary" />}
        title="Customer Reviews"
        description="Moderate customer ratings, verified feedback, photos and star moderation."
      />

      {/* ── 2. Minimalist KPI Ribbon (Mobile 2x2, Desktop 4-col) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Average Rating */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight">
                {averageRating}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">/ 5.0</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{totalCount} total reviews</p>
          </div>
        </div>

        {/* Pending Moderation */}
        <button
          onClick={() => setFilterStatus(filterStatus === "pending" ? "all" : "pending")}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center gap-3 shadow-2xs ${
            filterStatus === "pending"
              ? "border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/20"
              : "border-border/60 bg-card/60 hover:border-amber-500/40"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight">
                {pendingCount}
              </span>
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">Pending Approval</p>
          </div>
        </button>

        {/* Approved Reviews */}
        <button
          onClick={() => setFilterStatus(filterStatus === "approved" ? "all" : "approved")}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center gap-3 shadow-2xs ${
            filterStatus === "approved"
              ? "border-emerald-500/60 bg-emerald-500/10 ring-2 ring-emerald-500/20"
              : "border-border/60 bg-card/60 hover:border-emerald-500/40"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight">
              {approvedCount}
            </span>
            <p className="text-[11px] text-muted-foreground truncate">Live on Storefront</p>
          </div>
        </button>

        {/* Photo Reviews */}
        <button
          onClick={() => setFilterStatus(filterStatus === "with-images" ? "all" : "with-images")}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center gap-3 shadow-2xs ${
            filterStatus === "with-images"
              ? "border-primary/60 bg-primary/10 ring-2 ring-primary/20"
              : "border-border/60 bg-card/60 hover:border-primary/40"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight">
              {withImagesCount}
            </span>
            <p className="text-[11px] text-muted-foreground truncate">With Customer Photos</p>
          </div>
        </button>
      </div>

      {/* ── 3. Minimalist Single-Line Search & Simple Filter Toolbar ── */}
      <div className="p-2.5 sm:p-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs space-y-2 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search reviews or products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-8.5 text-xs rounded-xl bg-secondary/30 border-border/60 focus:bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* One-Button Simple Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8.5 text-xs font-semibold rounded-xl px-2.5 sm:px-3 gap-1.5 border-border/60 transition-all ${
                    filterStatus !== "all" || starFilter !== "all"
                      ? "bg-foreground text-background shadow-xs hover:bg-foreground/90"
                      : "bg-secondary/20 hover:bg-secondary/40 text-foreground"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {(filterStatus !== "all" || starFilter !== "all") && (
                    <span className="h-4 min-w-4 px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      {(filterStatus !== "all" ? 1 : 0) + (starFilter !== "all" ? 1 : 0)}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-72 p-3 space-y-3 rounded-2xl border-border/80 bg-popover/95 backdrop-blur-xl shadow-2xl z-[200]"
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    Filter Reviews
                  </span>
                  {(filterStatus !== "all" || starFilter !== "all" || searchQuery) && (
                    <button
                      onClick={resetFilters}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> Reset
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { id: "all", label: "All Reviews", count: totalCount },
                      { id: "pending", label: "Pending", count: pendingCount, highlight: pendingCount > 0 },
                      { id: "approved", label: "Approved", count: approvedCount },
                      { id: "with-images", label: "With Photos", count: withImagesCount },
                    ].map((tab) => {
                      const active = filterStatus === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setFilterStatus(tab.id as any);
                            setSelected(new Set());
                          }}
                          className={`p-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-1 transition-all ${
                            active
                              ? "bg-foreground text-background font-bold shadow-2xs"
                              : "bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className="truncate">{tab.label}</span>
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                              active
                                ? "bg-background/20 text-background"
                                : tab.highlight
                                ? "bg-amber-500/20 text-amber-500 font-bold"
                                : "bg-background/60 text-muted-foreground"
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                    Rating
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setStarFilter("all")}
                      className={`p-1.5 rounded-lg text-xs font-medium text-center transition-all ${
                        starFilter === "all"
                          ? "bg-foreground text-background font-bold shadow-2xs"
                          : "bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Stars
                    </button>
                    {[5, 4, 3, 2, 1].map((s) => {
                      const active = starFilter === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setStarFilter(active ? "all" : (s as any))}
                          className={`p-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                            active
                              ? "bg-amber-500 text-amber-950 font-bold shadow-2xs"
                              : "bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span>{s}</span>
                          <Star
                            className={`w-3 h-3 ${
                              active ? "fill-amber-950 text-amber-950" : "fill-amber-500/40 text-amber-500"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Quick Select All Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="h-8.5 text-xs font-semibold rounded-xl px-2.5 sm:px-3 gap-1.5 border-border/60 hover:bg-secondary/40"
            >
              <CheckCheck className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{allSelected ? "Deselect" : "Select All"}</span>
            </Button>
          </div>
        </div>

        {/* Active Filter Chips (if any filter is applied) */}
        {(filterStatus !== "all" || starFilter !== "all" || searchQuery) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Filtered by:</span>
            {filterStatus !== "all" && (
              <Badge
                variant="secondary"
                className="text-[10.5px] font-semibold gap-1 py-0.5 px-2 bg-secondary/70 border border-border/50"
              >
                {filterStatus === "pending"
                  ? "Pending Moderation"
                  : filterStatus === "approved"
                  ? "Approved"
                  : "With Photos"}
                <button
                  onClick={() => setFilterStatus("all")}
                  className="text-muted-foreground hover:text-foreground ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            )}
            {starFilter !== "all" && (
              <Badge
                variant="secondary"
                className="text-[10.5px] font-semibold gap-1 py-0.5 px-2 bg-secondary/70 border border-border/50 text-amber-500"
              >
                {starFilter} ★ Stars
                <button
                  onClick={() => setStarFilter("all")}
                  className="text-muted-foreground hover:text-foreground ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            )}
            {searchQuery && (
              <Badge
                variant="secondary"
                className="text-[10.5px] font-semibold gap-1 py-0.5 px-2 bg-secondary/70 border border-border/50"
              >
                "{searchQuery}"
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            )}
            <button
              onClick={resetFilters}
              className="text-[11px] text-primary hover:underline font-semibold ml-1"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── 4. Reviews List: Mobile Cards + Desktop Structured Cards ── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border border-border/50 bg-card/40 animate-pulse space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/60" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-40 bg-muted/60 rounded-md" />
                    <div className="h-3 w-24 bg-muted/40 rounded-md" />
                  </div>
                </div>
                <div className="h-12 w-full bg-muted/30 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 px-4 text-center rounded-2xl border border-dashed border-border/70 bg-card/30 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-bold text-foreground">No customer reviews found</p>
              <p className="text-xs text-muted-foreground">
                {hasActiveFilters
                  ? "No reviews match your current search or filter criteria."
                  : "Customer ratings and feedback will appear here after orders are placed."}
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-xs font-semibold rounded-full mt-2 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const isSelected = selected.has(r.id);
              const prodImg = getProductImage(r);
              const hasImages = r.images && r.images.length > 0;

              return (
                <div
                  key={r.id}
                  className={`p-3.5 sm:p-4.5 rounded-2xl border transition-all duration-200 bg-card/70 backdrop-blur-xs relative group ${
                    isSelected
                      ? "border-primary/60 bg-primary/5 shadow-xs"
                      : "border-border/60 dark:border-white/10 hover:border-primary/40 hover:bg-card/90"
                  }`}
                >
                  {/* Top Row: Checkbox, Product info, Status & Date */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(r.id)}
                        aria-label="Select review"
                        className="rounded-md mt-0.5"
                      />

                      {/* Product Thumbnail */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-secondary/40 border border-border/40 shrink-0 flex items-center justify-center">
                        {prodImg ? (
                          <img
                            src={prodImg}
                            alt={r.products?.name || "Product"}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-muted-foreground/60" />
                        )}
                      </div>

                      {/* Product Title & Date */}
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {r.products?.name || "Unassigned Product"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-muted-foreground/70" />
                            {format(new Date(r.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {r.is_approved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          <Check className="w-3 h-3" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating & Review Body */}
                  <div className="mt-3 pl-7 space-y-2">
                    {/* Stars */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= r.rating
                                ? "fill-amber-500 text-amber-500"
                                : "fill-muted/30 text-muted-foreground/20"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {r.rating}.0
                      </span>
                    </div>

                    {/* Title (if present) */}
                    {r.title && (
                      <p className="text-xs font-bold text-foreground tracking-tight">
                        {r.title}
                      </p>
                    )}

                    {/* Comment */}
                    {r.comment && (
                      <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/15 rounded-xl p-2.5 border border-border/30 italic">
                        "{r.comment}"
                      </p>
                    )}

                    {/* Customer Photo Gallery */}
                    {hasImages && (
                      <div className="pt-1">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                          {r.images!.map((imgUrl, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => setLightbox({ images: r.images!, index: imgIdx })}
                              className="relative w-14 h-14 rounded-xl overflow-hidden border border-border/60 hover:ring-2 ring-primary/40 shrink-0 group/img transition-all"
                            >
                              <img
                                src={imgUrl}
                                alt="Customer review photo"
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Maximize2 className="w-3.5 h-3.5" />
                              </div>
                            </button>
                          ))}
                          <span className="text-[10px] text-muted-foreground font-mono self-center pl-1">
                            {r.images!.length} photo{r.images!.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex items-center justify-between border-t border-border/40 gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={r.is_approved ? "outline" : "default"}
                          onClick={() =>
                            toggleApproval.mutate({ id: r.id, approved: !r.is_approved })
                          }
                          disabled={toggleApproval.isPending}
                          className={`h-7.5 text-xs font-semibold rounded-full px-3 gap-1.5 ${
                            r.is_approved
                              ? "border-border/60 text-muted-foreground hover:text-amber-500 hover:border-amber-500/40"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                          }`}
                        >
                          {r.is_approved ? (
                            <>
                              <X className="w-3.5 h-3.5" />
                              Hide Review
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Delete with Alert Dialog */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full px-2.5 gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl max-w-sm sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Customer Review?</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-muted-foreground">
                              This review will be permanently deleted from the database. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-semibold"
                              onClick={() => deleteReview.mutate(r.id)}
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. Sleek Floating Bulk Action Bar ── */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-40 w-[94vw] max-w-lg p-2 rounded-full border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 pl-3">
              <span className="text-xs font-mono font-bold text-foreground">
                {selected.size}
              </span>
              <span className="text-xs text-muted-foreground">selected</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Bulk Approve */}
              <Button
                size="sm"
                onClick={() =>
                  bulkAction.mutate({ ids: Array.from(selected), action: "approve" })
                }
                disabled={bulkAction.isPending}
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-3 gap-1 shadow-2xs"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Approve
              </Button>

              {/* Bulk Reject */}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  bulkAction.mutate({ ids: Array.from(selected), action: "reject" })
                }
                disabled={bulkAction.isPending}
                className="h-8 text-xs font-semibold rounded-full px-3 gap-1 border-border/60"
              >
                <XCircle className="w-3.5 h-3.5 text-amber-500" />
                Hide
              </Button>

              {/* Bulk Delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={bulkAction.isPending}
                    className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-full px-2.5 gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl max-w-sm sm:max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selected.size} Reviews?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground">
                      This will permanently remove the {selected.size} selected reviews from the database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-semibold"
                      onClick={() =>
                        bulkAction.mutate({ ids: Array.from(selected), action: "delete" })
                      }
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Deselect All */}
              <button
                onClick={() => setSelected(new Set())}
                className="p-1.5 rounded-full hover:bg-secondary/60 text-muted-foreground hover:text-foreground ml-1"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6. Fullscreen Image Lightbox Modal with Multi-Photo Controls ── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-2xl flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            {/* Top Toolbar */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <span className="text-xs font-mono font-bold text-foreground bg-secondary/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/40">
                Photo {lightbox.index + 1} of {lightbox.images.length}
              </span>

              <button
                className="p-2 rounded-full bg-secondary/80 hover:bg-secondary border border-border/40 text-foreground transition-all"
                onClick={() => setLightbox(null)}
                aria-label="Close photo preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Previous Photo Button */}
            {lightbox.images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: (prev.index - 1 + prev.images.length) % prev.images.length,
                        }
                      : null
                  );
                }}
                className="absolute left-4 p-2.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border/40 text-foreground transition-all z-10"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Photo */}
            <motion.img
              key={lightbox.images[lightbox.index]}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              src={lightbox.images[lightbox.index]}
              alt="Customer photo review"
              className="max-w-[92vw] max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-border/40"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Next Photo Button */}
            {lightbox.images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((prev) =>
                    prev
                      ? {
                          ...prev,
                          index: (prev.index + 1) % prev.images.length,
                        }
                      : null
                  );
                }}
                className="absolute right-4 p-2.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border/40 text-foreground transition-all z-10"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminReviews;
