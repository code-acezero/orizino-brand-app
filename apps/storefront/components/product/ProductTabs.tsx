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
  <div id={id} className="flex items-baseline gap-3 mb-4 pb-2 border-b border-border/40 scroll-mt-24">
    <Icon className="w-4 h-4 text-primary shrink-0 self-center" strokeWidth={1.5} />
    <h2 className="font-display text-xl sm:text-2xl text-foreground tracking-tight">{label}</h2>
    {meta && <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground ml-auto">{meta}</span>}
  </div>
);

const ProductTabs: React.FC<ProductTabsProps> = ({ product, reviews, ownReviewIds, layout = "premium" }) => {
  const specs = product.specifications;
  const hasSpecs = specs && Object.keys(specs).length > 0;

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* Anchor pill */}
      <nav aria-label="Sections" className="sticky top-16 z-10 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-background/95 border-y border-border/40">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <a href="#description" className="shrink-0 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
            Description
          </a>
          {hasSpecs && (
            <a href="#specifications" className="shrink-0 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
              Specifications
            </a>
          )}
          <a href="#reviews" className="shrink-0 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
            Reviews ({reviews.length})
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
        <SectionHead icon={MessageSquare} label="Reviews" meta={`${reviews.length} total`} id="reviews" />
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
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
