"use client";
import React, { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePageViewTracker } from "@/hooks/use-analytics";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Loader2 } from "lucide-react";

// Brand components
import CinematicHero from "@/components/CinematicHero";
import MarqueeStrip from "@/components/brand/MarqueeStrip";
import CollectionShowcase from "@/components/brand/CollectionShowcase";
import CategoryMosaic from "@/components/brand/CategoryMosaic";
import EditorialProductGrid from "@/components/brand/EditorialProductGrid";
import CinematicProductShowcase from "@/components/brand/CinematicProductShowcase";
import BrandSpecsSpotlight from "@/components/brand/BrandSpecsSpotlight";
import LookbookSpotlight from "@/components/brand/LookbookSpotlight";
import InstagramFeed from "@/components/brand/InstagramFeed";
import PressQuoteBanner from "@/components/brand/PressQuoteBanner";
import HomePopup from "@/components/HomePopup";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

const HomePage: React.FC = () => {
  useSeoMeta("home", "Orizino — Premium Drop Shoulder Streetwear");
  usePageViewTracker("/");
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
    await new Promise((r) => setTimeout(r, 600));
  }, [queryClient]);

  const { pullDistance, refreshing } = usePullToRefresh(handleRefresh);

  // Section titles & configs from DB
  const { data: homeSections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["home-sections-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_sections_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: homeSpecsConfig, isLoading: specsLoading } = useQuery({
    queryKey: ["home-specs-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_specs_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: homeLookbookConfig, isLoading: lookbookLoading } = useQuery({
    queryKey: ["home-lookbook-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_lookbook_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: homeInstagramConfig, isLoading: instagramLoading } = useQuery({
    queryKey: ["home-instagram-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "home_instagram_config")
        .maybeSingle();
      if (!data?.value) return null;
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 0,
  });

  const featuredTitle = homeSections?.featured_title || "Featured Essentials";
  const featuredSubtitle = homeSections?.featured_subtitle || "Handpicked heavyweight drop-shoulder pieces";
  const newArrivalsTitle = homeSections?.new_arrivals_title || "New Arrivals";
  const newArrivalsSubtitle = homeSections?.new_arrivals_subtitle || "Latest limited drops & silhouettes";
  const collectionsTitle = homeSections?.collections_title || "Curated Collections";
  const collectionsSubtitle = homeSections?.collections_subtitle || "Explore by style & drop edition";

  // Featured products
  const { data: featuredProducts = [], isLoading: featuredLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, compare_at_price, thumbnail, avg_rating, review_count, slug")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  // New arrivals
  const { data: newArrivals = [], isLoading: arrivalsLoading } = useQuery({
    queryKey: ["new-arrival-products", 8],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, compare_at_price, thumbnail, avg_rating, review_count, slug")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  const [activeCategory, setActiveCategory] = React.useState("ALL");

  const CATEGORY_TABS = ["ALL", "TEES", "HOODIES", "PANTS", "OUTERWEAR"];

  const filteredArrivals = React.useMemo(() => {
    if (activeCategory === "ALL") return newArrivals;
    const cat = activeCategory.toLowerCase();
    const matches = newArrivals.filter((p) => {
      const name = (p.name || "").toLowerCase();
      if (cat === "tees") return name.includes("tee") || name.includes("t-shirt") || name.includes("top");
      if (cat === "hoodies") return name.includes("hoodie") || name.includes("sweatshirt") || name.includes("sweater");
      if (cat === "pants") return name.includes("pant") || name.includes("cargo") || name.includes("trouser") || name.includes("short");
      if (cat === "outerwear") return name.includes("jacket") || name.includes("coat") || name.includes("vest");
      return true;
    });
    return matches.length > 0 ? matches : newArrivals;
  }, [activeCategory, newArrivals]);

  return (
    <div suppressHydrationWarning className="min-h-screen relative w-full overflow-x-hidden m-0 p-0">
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
          style={{
            transform: `translateY(${refreshing ? 60 : pullDistance}px)`,
            transition: refreshing ? "transform 0.3s ease" : "none",
          }}
        >
          <div className="bg-card border border-border rounded-full p-2.5 shadow-lg mt-2">
            <Loader2
              className={`w-5 h-5 text-primary ${refreshing ? "animate-spin" : ""}`}
              style={{ transform: refreshing ? "none" : `rotate(${pullDistance * 3}deg)` }}
            />
          </div>
        </div>
      )}

      {/* ── 1. Cinematic Hero (full viewport, edge-to-edge — navbar is transparent) ── */}
      <div className="w-full m-0 p-0">
        <CinematicHero />
      </div>

      {/* ── 2. Marquee brand strip ── */}
      <MarqueeStrip />

      {/* ── 3. Featured Products (editorial grid) ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-4 lg:py-6">
        <EditorialProductGrid
          products={featuredProducts}
          isLoading={featuredLoading || sectionsLoading}
          title={featuredTitle}
          subtitle={featuredSubtitle}
          viewAllLink="/inventory"
          maxProducts={7}
        />
      </section>

      {/* ── 4. Engineered Craftsmanship & Specs Spotlight ("The Orizino Standard") ── */}
      {homeSpecsConfig?.is_enabled !== false && (
        <section className="w-full px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-8">
          <BrandSpecsSpotlight config={homeSpecsConfig} isLoading={specsLoading} />
        </section>
      )}

      {/* ── 5. Category Mosaic ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-4 lg:py-6">
        <CategoryMosaic />
      </section>

      {/* ── 8. Campaign Lookbook Spotlight ("Shop The Look") ── */}
      {homeLookbookConfig?.is_enabled !== false && (
        <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5 lg:py-8">
          <LookbookSpotlight config={homeLookbookConfig} isLoading={lookbookLoading} />
        </section>
      )}

      {/* ── 9. Editorial Press Quote Spotlight ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-4 lg:py-6">
        <PressQuoteBanner />
      </section>

      {/* ── 10. Marquee (dark variant) ── */}
      <MarqueeStrip dark />

      {/* ── 11. Collection horizontal scroll showcase ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-4 lg:py-6">
        <CollectionShowcase title={collectionsTitle} subtitle={collectionsSubtitle} />
      </section>

      {/* ── 9. New Arrivals section with Live Category Pills ── */}
      {(!arrivalsLoading && newArrivals.length === 0) ? null : (
        <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-4 lg:py-6">
          <div className="flex flex-col items-center text-center justify-center mb-6 gap-2">
            {sectionsLoading || arrivalsLoading ? (
              <div className="h-8 w-44 rounded-lg bg-muted/60 animate-pulse mb-1" />
            ) : (
              <h2 className="heading-editorial text-3xl sm:text-4xl text-foreground font-bold tracking-tight">
                {newArrivalsTitle}
              </h2>
            )}
            {sectionsLoading || arrivalsLoading ? (
              <div className="h-4 w-56 rounded-md bg-muted/40 animate-pulse" />
            ) : newArrivalsSubtitle ? (
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md">{newArrivalsSubtitle}</p>
            ) : null}

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeCategory === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveCategory(tab)}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-sans-brand font-semibold tracking-wider uppercase transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground scale-105"
                        : "bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/40"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {arrivalsLoading ? (
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5 w-full">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-[calc(50%-0.5rem)] sm:w-[210px] md:w-[230px] lg:w-[250px] xl:w-[260px] shrink-0">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5 w-full">
              {filteredArrivals.slice(0, 7).map((product) => {
                const ProductCard = React.lazy(() => import("@/components/ProductCard"));
                return (
                  <div key={product.id} className="w-[calc(50%-0.5rem)] sm:w-[210px] md:w-[230px] lg:w-[250px] xl:w-[260px] shrink-0">
                    <React.Suspense fallback={<ProductCardSkeleton />}>
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
                    </React.Suspense>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── 10. Community Outfit Feed (#OrizinoStyle) ── */}
      {homeInstagramConfig?.is_enabled !== false && (
        <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5 lg:py-8">
          <InstagramFeed config={homeInstagramConfig} isLoading={instagramLoading} />
        </section>
      )}

      {/* ── 11. Cinematic Product Showcase (Full bleed — admin controlled) ── */}
      <CinematicProductShowcase />
    </div>
  );
};

export default HomePage;
