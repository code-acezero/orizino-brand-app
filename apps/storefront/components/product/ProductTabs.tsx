"use client";
import React from "react";
import { FileText, ListChecks, MessageSquare } from "lucide-react";
import ReviewForm from "@/components/ReviewForm";
import ReviewCard from "@/components/ReviewCard";

interface Review {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  is_approved?: boolean;
}

interface ProductTabsProps {
  product: {
    id: string;
    description?: string | null;
    specifications?: Record<string, string> | null;
  };
  reviews: Review[];
  ownReviewIds: Set<string>;
  layout?: "minimal" | "premium" | "editorial";
}

const SectionHead: React.FC<{ icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; meta?: string; id: string }> = ({ icon: Icon, label, meta, id }) => (
  <div id={id} className="flex items-baseline gap-2.5 sm:gap-3 mb-4 pb-2 border-b border-border/40 scroll-mt-24 sm:scroll-mt-28">
    <Icon className="w-4 h-4 text-primary shrink-0 self-center" strokeWidth={1.5} />
    <h2 className="font-display text-xl sm:text-2xl text-foreground tracking-tight">{label}</h2>
    {meta && <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground ml-auto">{meta}</span>}
  </div>
);

const ProductTabs: React.FC<ProductTabsProps> = ({ product, reviews, ownReviewIds, layout = "premium" }) => {
  const specs = product.specifications;
  const hasSpecs = specs && Object.keys(specs).length > 0;

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Anchor Segmented Bar — Sticks seamlessly below top nav with ZERO gap */}
      <nav aria-label="Product Sections" className="sticky top-12 lg:top-14 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 py-1.5 bg-background/95 backdrop-blur-md border-y border-border/60 shadow-xs">
        <div className={`grid ${hasSpecs ? "grid-cols-3" : "grid-cols-2"} gap-1 w-full max-w-xl mx-auto p-1 bg-secondary/50 dark:bg-card/70 rounded-xl border border-border/40`}>
          <a
            href="#description"
            className="flex items-center justify-center gap-1.5 py-1.5 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 active:bg-background transition-all text-center leading-none select-none"
          >
            <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
            <span>Description</span>
          </a>

          {hasSpecs && (
            <a
              href="#specifications"
              className="flex items-center justify-center gap-1.5 py-1.5 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 active:bg-background transition-all text-center leading-none select-none"
            >
              <ListChecks className="w-3.5 h-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
              <span>
                <span className="sm:hidden">Specs</span>
                <span className="hidden sm:inline">Specifications</span>
              </span>
            </a>
          )}

          <a
            href="#reviews"
            className="flex items-center justify-center gap-1.5 py-1.5 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 active:bg-background transition-all text-center leading-none select-none"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
            <span>Reviews</span>
            {reviews.length > 0 && (
              <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold leading-none">
                {reviews.length}
              </span>
            )}
          </a>
        </div>
      </nav>

      {/* Description */}
      <section>
        <SectionHead icon={FileText} label="Description" id="description" />
        {product.description ? (
          <div className="prose-sm max-w-none">
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line break-words">{product.description}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No description available.</p>
        )}
      </section>

      {/* Specifications */}
      {hasSpecs && (
        <section>
          <SectionHead icon={ListChecks} label="Specifications" id="specifications" />
          <div className="divide-y divide-border/40 border-y border-border/40">
            {Object.entries(specs!).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-4 text-xs sm:text-sm px-1 py-2.5 sm:py-3">
                <span className="text-muted-foreground uppercase tracking-wide text-[11px] sm:text-xs shrink-0">{key}</span>
                <span className="text-foreground font-medium text-right break-words min-w-0">{val}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section>
        <SectionHead icon={MessageSquare} label="Reviews" meta={reviews.length > 0 ? `${reviews.length} total` : undefined} id="reviews" />
        <div className="w-full mb-6">
          <ReviewForm productId={product.id} />
        </div>
        {reviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isOwn={ownReviewIds.has(review.id)}
                productId={product.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductTabs;
// code:4ce0
