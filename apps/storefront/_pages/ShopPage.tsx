"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import SectionShimmer from "@/components/skeletons/SectionShimmer";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, SlidersHorizontal, Tag, ChevronDown,
  LayoutGrid, LayoutList, ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BottomSheet } from "@/components/mobile";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryMonochromeIcon } from "@shared/components/CategoryMonochromeIcon";

/* ─── helpers ─────────────────────────────────────────────────── */
const getColorHex = (name: string) => name.trim().toLowerCase() || "#888";

const sortOptions = [
  { label: "Newest",            value: "newest" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
  { label: "Top Rated",         value: "rating" },
  { label: "Most Popular",      value: "popular" },
];

/* ─── tiny primitives ─────────────────────────────────────────── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/60 mb-2">
    {children}
  </p>
);

const Divider = () => <div className="border-t border-border/40 my-5" />;

const FilterChip = ({
  label, onRemove,
}: { label: string; onRemove: () => void }) => (
  <button
    onClick={onRemove}
    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-border/60
               text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40
               transition-colors"
  >
    {label}
    <X className="w-2.5 h-2.5" />
  </button>
);

/* ─── main component ──────────────────────────────────────────── */
const ShopPage: React.FC = () => {
  useSeoMeta("shop", "Shop | Store");
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const [searchQuery,          setSearchQuery]          = useState(searchParams.get("q") || "");
  const [sort,                 setSort]                 = useState(searchParams.get("sort") || "newest");
  const [selectedCategory,     setSelectedCategory]     = useState(searchParams.get("cat") || "");
  const [expandedParent,       setExpandedParent]       = useState<string | null>(null);
  const [priceRange,           setPriceRange]           = useState<[number, number]>([0, 10000]);
  const [mobileFilterOpen,     setMobileFilterOpen]     = useState(false);
  const [selectedSizes,        setSelectedSizes]        = useState<string[]>([]);
  const [selectedColors,       setSelectedColors]       = useState<string[]>([]);
  const [selectedTags,         setSelectedTags]         = useState<string[]>([]);
  const [selectedCustomFilters,setSelectedCustomFilters]= useState<Record<string, string[]>>({});
  const [gridCols,             setGridCols]             = useState<2|3|4>(3);
  const [sortOpen,             setSortOpen]             = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ─── data ─────────────────────────────────────────── */
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-name"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["site_name"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => (map[s.key] = s.value));
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  const rawName = siteSettings?.site_name;
  const siteName = ((typeof rawName === "object" && rawName !== null && "value" in rawName
    ? (rawName as any).value : rawName) as string) || "Shop";

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, icon, icon_url, parent_id, accent_color")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const parentCategories = categories?.filter((c) => !c.parent_id) || [];
  const getChildren      = (pid: string) => categories?.filter((c) => c.parent_id === pid) || [];

  const { data: productCounts } = useQuery({
    queryKey: ["product-counts-by-category"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("category_id").eq("is_active", true);
      const counts: Record<string, number> = {};
      (data || []).forEach((p) => { if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1; });
      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });

  const getCategoryCount = (catId: string): number => {
    const direct   = productCounts?.[catId] || 0;
    const children = getChildren(catId);
    return direct + children.reduce((sum, c) => sum + (productCounts?.[c.id] || 0), 0);
  };

  const activeCategoryIds = useMemo(() => {
    if (!selectedCategory) return null;
    return [selectedCategory, ...getChildren(selectedCategory).map((c) => c.id)];
  }, [selectedCategory, categories]);

  const { data: allVariants } = useQuery({
    queryKey: ["shop-variant-filters", activeCategoryIds],
    queryFn: async () => {
      let query = supabase.from("product_variants").select("product_id, size, color").eq("is_active", true);
      if (activeCategoryIds) {
        const { data: cp } = await supabase.from("products").select("id").eq("is_active", true).in("category_id", activeCategoryIds);
        const ids = (cp || []).map((p) => p.id);
        if (!ids.length) return [];
        query = query.in("product_id", ids);
      }
      const { data } = await query;
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: categoryFilters } = useQuery({
    queryKey: ["category-filters", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const cat = categories?.find((c) => c.id === selectedCategory);
      const ids  = [selectedCategory, ...(cat?.parent_id ? [cat.parent_id] : [])];
      const { data } = await supabase
        .from("category_filters")
        .select("*")
        .in("category_id", ids)
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    staleTime: 60000,
    enabled: !!selectedCategory,
  });

  const availableSizes  = useMemo(() => [...new Set((allVariants || []).map((v) => v.size).filter(Boolean))] as string[], [allVariants]);
  const availableColors = useMemo(() => [...new Set((allVariants || []).map((v) => v.color).filter(Boolean))] as string[], [allVariants]);

  const { data: availableTags } = useQuery({
    queryKey: ["shop-product-tags", activeCategoryIds],
    queryFn: async () => {
      let q = supabase.from("products").select("tags").eq("is_active", true);
      if (activeCategoryIds) q = q.in("category_id", activeCategoryIds);
      const { data } = await q;
      const set = new Set<string>();
      (data || []).forEach((p) => (p.tags || []).forEach((t: string) => set.add(t)));
      return [...set].sort();
    },
    staleTime: 60000,
  });

  const variantFilteredProductIds = useMemo(() => {
    if (!allVariants || (!selectedSizes.length && !selectedColors.length)) return null;
    return new Set(
      allVariants
        .filter((v) => {
          const ms = !selectedSizes.length  || (v.size  && selectedSizes.includes(v.size));
          const mc = !selectedColors.length || (v.color && selectedColors.includes(v.color));
          return ms && mc;
        })
        .map((v) => v.product_id)
    );
  }, [allVariants, selectedSizes, selectedColors]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", activeCategoryIds, sort],
    queryFn: async () => {
      let q = supabase.from("products").select("*").eq("is_active", true);
      if (activeCategoryIds?.length) q = q.in("category_id", activeCategoryIds);
      switch (sort) {
        case "price_asc":  q = q.order("price",        { ascending: true  }); break;
        case "price_desc": q = q.order("price",        { ascending: false }); break;
        case "rating":     q = q.order("avg_rating",   { ascending: false }); break;
        case "popular":    q = q.order("review_count", { ascending: false }); break;
        default:           q = q.order("created_at",   { ascending: false });
      }
      const { data } = await q;
      return data || [];
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const ms = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const mp = p.price >= priceRange[0] && p.price <= priceRange[1];
      const mv = !variantFilteredProductIds || variantFilteredProductIds.has(p.id);
      const mt = !selectedTags.length || selectedTags.some((t) => (p.tags || []).includes(t));
      return ms && mp && mv && mt;
    });
  }, [products, searchQuery, priceRange, variantFilteredProductIds, selectedTags]);

  /* ─── handlers ─────────────────────────────────────── */
  const handleParentClick = (catId: string) => {
    setExpandedParent(expandedParent === catId ? null : catId);
    setSelectedCategory(catId);
    setSelectedCustomFilters({});
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedTags([]);
  };
  const handleSubClick = (subId: string) => {
    setSelectedCategory(subId);
    setSelectedCustomFilters({});
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedTags([]);
  };
  const clearCategoryAndSubs = () => {
    setSelectedCategory("");
    setExpandedParent(null);
    setSelectedCustomFilters({});
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedTags([]);
  };

  const toggleSize        = (s: string) => setSelectedSizes(p  => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleColor       = (c: string) => setSelectedColors(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const toggleTag         = (t: string) => setSelectedTags(p   => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleCustomFilter = (name: string, val: string) => {
    setSelectedCustomFilters(p => {
      const cur     = p[name] || [];
      const updated = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
      return { ...p, [name]: updated };
    });
  };

  const activeFilterCount =
    selectedSizes.length + selectedColors.length + selectedTags.length +
    Object.values(selectedCustomFilters).reduce((s, a) => s + a.length, 0) +
    (selectedCategory ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedSizes([]); setSelectedColors([]); setSelectedTags([]);
    setSelectedCustomFilters({}); setSelectedCategory(""); setExpandedParent(null);
    setSearchQuery(""); setPriceRange([0, 10000]);
  };

  const getCategoryIcon = (cat: { icon_url: string | null; icon: string | null }) =>
    cat.icon_url || null;

  /* ─── filter panel (shared for desktop sidebar & mobile sheet) ─ */
  const FilterPanel = () => (
    <div className="space-y-0">
      {/* Categories */}
      <div>
        <SectionLabel>Categories</SectionLabel>
        <div className="space-y-0.5">
          {/* All */}
          <button
            onClick={clearCategoryAndSubs}
            className={`flex items-center w-full text-left px-0 py-2 text-sm transition-colors border-0 bg-transparent
              ${!selectedCategory ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            All Products
          </button>
          {parentCategories.map((cat) => {
            const children  = getChildren(cat.id);
            const isExp     = expandedParent === cat.id;
            const isSel     = selectedCategory === cat.id;
            const count     = getCategoryCount(cat.id);
            return (
              <div key={cat.id}>
                <button
                  onClick={() => handleParentClick(cat.id)}
                  className={`flex items-center gap-2 w-full text-left px-0 py-2 text-sm transition-colors bg-transparent border-0
                    ${isSel ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <CategoryMonochromeIcon
                    icon={cat.icon}
                    iconUrl={cat.icon_url}
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="flex-1 text-left">{cat.name}</span>
                  {count > 0 && <span className="text-[10px] text-muted-foreground/60 tabular-nums">{count}</span>}
                  {children.length > 0 && (
                    <ChevronDown className={`w-3 h-3 shrink-0 transition-transform text-muted-foreground/50 ${isExp ? "rotate-180" : ""}`} />
                  )}
                </button>
                <AnimatePresence>
                  {isExp && children.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-3 border-l border-border/30 ml-2 mb-1 space-y-0.5">
                        {children.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => handleSubClick(sub.id)}
                            className={`flex items-center gap-2 w-full text-left py-1.5 text-xs transition-colors bg-transparent border-0
                              ${selectedCategory === sub.id ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            <CategoryMonochromeIcon
                              icon={sub.icon}
                              iconUrl={sub.icon_url}
                              className="w-3.5 h-3.5 shrink-0"
                            />
                            <span className="flex-1">{sub.name}</span>
                            {productCounts && <span className="text-[10px] text-muted-foreground/50 tabular-nums">{productCounts[sub.id] || 0}</span>}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category-scoped attribute filters */}
      {selectedCategory && (
        <>
          {availableSizes.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Size</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`px-2.5 py-1 rounded-sm border text-xs font-medium transition-colors
                        ${selectedSizes.includes(size)
                          ? "bg-foreground text-background border-foreground"
                          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {availableColors.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Color</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => toggleColor(color)}
                      title={color}
                      className={`w-6 h-6 rounded-full border-2 transition-all
                        ${selectedColors.includes(color)
                          ? "border-foreground ring-1 ring-foreground/20 scale-110"
                          : "border-border/40 hover:border-foreground/40"}`}
                      style={{ backgroundColor: getColorHex(color) }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {categoryFilters && categoryFilters.length > 0 && categoryFilters.map((filter: any) => (
            <React.Fragment key={filter.id}>
              <Divider />
              <div>
                <SectionLabel>{filter.filter_name}</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {(filter.filter_values || []).map((val: string) => {
                    const active = (selectedCustomFilters[filter.filter_name] || []).includes(val);
                    return (
                      <button
                        key={val}
                        onClick={() => toggleCustomFilter(filter.filter_name, val)}
                        className={`px-2.5 py-1 rounded-sm border text-xs font-medium transition-colors
                          ${active
                            ? "bg-foreground text-background border-foreground"
                            : "border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            </React.Fragment>
          ))}

          {availableTags && availableTags.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Tags</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-sm border text-xs font-medium transition-colors
                        ${selectedTags.includes(tag)
                          ? "bg-foreground text-background border-foreground"
                          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Divider />

      {/* Price range */}
      <div>
        <SectionLabel>Price Range</SectionLabel>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={priceRange[0] || ""}
            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
            className="w-full px-2.5 py-1.5 border border-border/50 bg-transparent rounded-sm text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40"
          />
          <span className="text-muted-foreground/40 text-xs shrink-0">—</span>
          <input
            type="number"
            placeholder="Max"
            value={priceRange[1] === 10000 ? "" : priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 10000])}
            className="w-full px-2.5 py-1.5 border border-border/50 bg-transparent rounded-sm text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40"
          />
        </div>
      </div>

      <Divider />

      {/* Sort (inside filter panel on mobile) */}
      <div>
        <SectionLabel>Sort</SectionLabel>
        <div className="space-y-0.5">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`w-full text-left py-1.5 text-xs transition-colors bg-transparent border-0
                ${sort === opt.value ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <>
          <Divider />
          <button
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Clear all filters
          </button>
        </>
      )}
    </div>
  );

  /* ─── grid col class map ─────────────────────────────── */
  const gridClass: Record<2|3|4, string> = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  };

  const currentSortLabel = sortOptions.find(o => o.value === sort)?.label ?? "Newest";

  /* ─── render ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 pb-16">

        {/* Breadcrumb */}
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Inventory" }]}
          className="mb-6 hidden md:block"
        />

        {/* ── Page header ─────────────────────────────────── */}
        <div className="border-b border-border/40 pb-5 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground/60 mb-1">
              {siteName}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Inventory
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? "Loading…" : `${filteredProducts.length} products`}
            </p>
          </div>

          {/* Desktop: Search + Sort + Grid toggle */}
          <div className="hidden md:flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 py-2 w-52 border border-border/50 bg-transparent rounded-sm text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/50 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setSortOpen(v => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-border/50 rounded-sm text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{currentSortLabel}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 w-44 bg-background border border-border/60 rounded-sm shadow-sm z-30"
                  >
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setSort(opt.value); setSortOpen(false); }}
                        className={`block w-full text-left px-3 py-2 text-xs transition-colors
                          ${sort === opt.value ? "text-foreground font-medium bg-secondary/40" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Grid density */}
            <div className="flex items-center gap-0.5 border border-border/50 rounded-sm overflow-hidden">
              {([3, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setGridCols(n)}
                  title={`${n} columns`}
                  className={`px-2 py-2 transition-colors ${gridCols === n ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {n === 3 ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: search row */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-border/50 bg-transparent rounded-sm text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-border/50 rounded-sm text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 relative"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <BottomSheet
              open={mobileFilterOpen}
              onOpenChange={setMobileFilterOpen}
              title="Filter & Sort"
              height="tall"
            >
              <FilterPanel />
            </BottomSheet>
          </div>
        </div>

        {/* ── Mobile: category chip rail ─────────────────── */}
        {parentCategories.length > 0 && (
          <div className="md:hidden -mx-4 px-4 mb-5 sticky top-14 z-20 bg-background/90 backdrop-blur-xl py-2.5 border-b border-border/20">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={clearCategoryAndSubs}
                className={`shrink-0 px-3.5 py-1.5 rounded-sm border text-xs font-medium transition-colors
                  ${!selectedCategory ? "bg-foreground text-background border-foreground" : "border-border/50 text-muted-foreground"}`}
              >
                All
              </button>
              {parentCategories.map((cat) => {
                const active  = selectedCategory === cat.id;
                const iconSrc = getCategoryIcon(cat);
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleParentClick(cat.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors
                      ${active ? "bg-foreground text-background border-foreground" : "border-border/50 text-muted-foreground"}`}
                  >
                    {iconSrc && <img src={iconSrc} alt="" className="w-3.5 h-3.5 object-contain" />}
                    {!iconSrc && cat.icon && <span>{cat.icon}</span>}
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Active filter chips ────────────────────────── */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-5">
            {selectedSizes.map(s   => <FilterChip key={`sz-${s}`}   label={`Size: ${s}`}  onRemove={() => toggleSize(s)} />)}
            {selectedColors.map(c  => <FilterChip key={`cl-${c}`}   label={c}             onRemove={() => toggleColor(c)} />)}
            {selectedTags.map(t    => <FilterChip key={`tg-${t}`}   label={t}             onRemove={() => toggleTag(t)} />)}
            {Object.entries(selectedCustomFilters).flatMap(([name, vals]) =>
              vals.map(v => <FilterChip key={`cf-${name}-${v}`} label={`${name}: ${v}`} onRemove={() => toggleCustomFilter(name, v)} />)
            )}
            {selectedCategory && (
              <FilterChip
                label={categories?.find(c => c.id === selectedCategory)?.name ?? "Category"}
                onRemove={clearCategoryAndSubs}
              />
            )}
            {(priceRange[0] > 0 || priceRange[1] < 10000) && (
              <FilterChip label={`Price: ${priceRange[0]}–${priceRange[1]}`} onRemove={() => setPriceRange([0, 10000])} />
            )}
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Two-column layout: Sidebar + Grid ──────────── */}
        <div className="flex gap-10 xl:gap-14">

          {/* Desktop filter sidebar */}
          <aside className="hidden md:block w-44 shrink-0">
            <div className="sticky top-24">
              <FilterPanel />
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <SectionShimmer of="productGrid" count={9} />
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-10 h-10 rounded-full border border-border/40 flex items-center justify-center mb-4">
                  <Search className="w-4 h-4 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No products found</p>
                <p className="text-xs text-muted-foreground">Try adjusting your filters or search</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-4 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <motion.div
                layout
                className={`grid ${gridClass[gridCols]} gap-3 sm:gap-4`}
              >
                {filteredProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.025, 0.35), duration: 0.22 }}
                  >
                    <ProductCard
                      id={product.id}
                      name={product.name}
                      price={Number(product.price)}
                      compareAtPrice={product.compare_at_price ? Number(product.compare_at_price) : undefined}
                      thumbnail={product.thumbnail ?? undefined}
                      avgRating={product.avg_rating ? Number(product.avg_rating) : undefined}
                      reviewCount={product.review_count ?? undefined}
                      slug={product.slug}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
