"use client";
import React, { useState, useMemo } from "react";
import { useParams, Link } from "@/lib/router-compat";
import SectionShimmer from "@/components/skeletons/SectionShimmer";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCategorySeoMeta } from "@/hooks/use-category-seo-meta";
import ProductCard from "@/components/ProductCard";
import Breadcrumbs from "@/components/Breadcrumbs";

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Top Rated", value: "rating" },
];

function getYouTubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&?/]+)/);
  return m?.[1] || null;
}

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sort, setSort] = useState("newest");
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  // Bundle category + parent + subcategories into a single query — one round-trip
  // instead of three sequential ones, and stale-time keeps it cached across navs.
  const { data: catBundle, isLoading: catLoading } = useQuery({
    queryKey: ["category-bundle", slug],
    queryFn: async () => {
      const { data: cat, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url, icon, icon_url, accent_color, banner_type, banner_url, youtube_url, parent_id, meta_title, meta_description, meta_keywords")
        .eq("slug", slug!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!cat) return { category: null, parent: null, subcategories: [] as Array<{ id: string; name: string; slug: string; icon: string | null; icon_url: string | null; accent_color: string | null }> };

      // Parallel fetch parent + children — independent queries, single waterfall hop.
      const [parentRes, childrenRes] = await Promise.all([
        cat.parent_id
          ? supabase.from("categories").select("name, slug").eq("id", cat.parent_id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as const),
        supabase
          .from("categories")
          .select("id, name, slug, icon, icon_url, accent_color")
          .eq("parent_id", cat.id)
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      return {
        category: cat,
        parent: parentRes.data ?? null,
        subcategories: childrenRes.data ?? [],
      };
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // category metadata is slow-moving
  });

  const category = catBundle?.category ?? null;
  const parentCategory = catBundle?.parent ?? null;
  const subcategories = catBundle?.subcategories ?? [];

  // Apply SEO metadata for category page
  useCategorySeoMeta(category as any);

  // Stable IDs to query — INCLUDE subcategory ids in the key so the
  // products query refetches once subcategories are known (this was the
  // bug: parent categories with no direct products showed an empty grid).
  const catIds = useMemo(() => {
    if (selectedSub) return [selectedSub];
    if (!category?.id) return [];
    return [category.id, ...subcategories.map((s) => s.id)];
  }, [selectedSub, category?.id, subcategories]);
  const catIdsKey = useMemo(() => [...catIds].sort().join(","), [catIds]);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["category-products", catIdsKey, sort],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, price, compare_at_price, thumbnail, avg_rating, review_count, slug")
        .eq("is_active", true)
        .in("category_id", catIds);

      switch (sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "rating": query = query.order("avg_rating", { ascending: false, nullsFirst: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }

      const { data } = await query.limit(50);
      return data || [];
    },
    enabled: catIds.length > 0,
  });

  const accentColor = category?.accent_color || "#6366f1";
  const bannerType = category?.banner_type || "image";
  const bannerUrl = category?.banner_url;
  const youtubeUrl = category?.youtube_url;
  const ytId = youtubeUrl ? getYouTubeId(youtubeUrl) : null;

  if (catLoading) {
    return (
      <div className="min-h-screen pb-20 lg:pb-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-6">
          <div className="h-32 sm:h-48 rounded-3xl bg-secondary/30 animate-pulse" />
          <SectionShimmer of="categoryChips" count={6} />
          <SectionShimmer of="productGrid" count={8} />
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen pb-20 lg:pb-0">
          <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">Category not found</h1>
          <Link to="/" className="text-primary mt-4 inline-block hover:underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-4">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/inventory" },
          ...(parentCategory ? [{ label: parentCategory.name, href: `/categories/${parentCategory.slug}` }] : []),
          { label: category.name },
        ]} className="mb-2" />
      </div>
      {/* Banner Section with fading shadow */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: "260px", maxHeight: "400px" }}>
        {/* Banner content */}
        {bannerType === "youtube" && ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0`}
            className="absolute inset-0 w-full h-full"
            style={{ minHeight: "400px" }}
            allow="autoplay; encrypted-media"
            allowFullScreen
            frameBorder="0"
          />
        ) : bannerUrl ? (
          <img
            src={bannerUrl}
            alt={category.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)` }}
          />
        )}

        {/* Fading shadow overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, ${accentColor}44 0%, hsl(var(--background)) 100%)`,
          }}
        />

        {/* Category info overlay */}
        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col justify-end h-full pb-8 pt-20">
          <div className="flex items-center gap-4">
            {category.icon_url && (
              <img src={category.icon_url} alt="" className="w-14 h-14 rounded-2xl object-contain bg-background/50 p-2" />
            )}
            <div>
              <h1 className="text-3xl md:text-5xl font-bold text-foreground drop-shadow-lg" style={{ fontFamily: 'var(--font-title, var(--font-display))' }}>
                {category.name}
              </h1>
              {category.description && (
                <p className="text-muted-foreground mt-1 max-w-lg">{category.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8">
        {/* Subcategory chips */}
        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSub(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                !selectedSub
                  ? "text-primary-foreground border-transparent"
                  : "text-foreground border-border hover:border-primary/50"
              }`}
              style={!selectedSub ? { background: accentColor } : undefined}
            >
              All
            </button>
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSub(sub.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border flex items-center gap-2 ${
                  selectedSub === sub.id
                    ? "text-primary-foreground border-transparent"
                    : "text-foreground border-border hover:border-primary/50"
                }`}
                style={selectedSub === sub.id ? { background: accentColor } : undefined}
              >
                {sub.icon_url ? (
                  <img src={sub.icon_url} alt="" className="w-4 h-4 object-contain" />
                ) : sub.icon ? (
                  <span>{sub.icon}</span>
                ) : null}
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* Sort bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none bg-secondary/50 text-foreground text-sm px-4 py-2 pr-8 rounded-full border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Products grid */}
        {productsLoading ? (
          <SectionShimmer of="productGrid" count={8} />
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No products in this category yet.</p>
            <Link to="/inventory" className="text-primary mt-2 inline-block hover:underline">Browse all products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
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
          </div>
        )}
      </main>

    </div>
  );
};

export default CategoryPage;
// code:4ce0
