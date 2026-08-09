"use client";
import { useEffect } from "react";

interface Product {
  name: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  thumbnail?: string;
  short_description?: string;
  slug: string;
  price?: number;
  avg_rating?: number | null;
  review_count?: number | null;
}

const setMeta = (name: string, content: string, attr = "name") => {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const setLink = (rel: string, href: string) => {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const setJsonLd = (json: string) => {
  const existing = document.querySelector('script[data-seo-jsonld-product]');
  if (existing) existing.remove();
  if (!json) return;
  try {
    JSON.parse(json); // validate
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-jsonld-product", "true");
    script.textContent = json;
    document.head.appendChild(script);
  } catch {
    // invalid JSON-LD, skip
  }
};

/**
 * Hook that applies SEO metadata for product detail pages.
 * Uses product-specific meta_title, meta_description, and generates JSON-LD structured data.
 */
export const useProductSeoMeta = (product: Product | undefined) => {
  useEffect(() => {
    if (!product) {
      document.title = "Product | Store";
      return;
    }

    // Title
    const title = product.meta_title || product.name;
    document.title = `${title} | Store`;

    // Meta description
    const description = product.meta_description || product.short_description || "";
    setMeta("description", description);

    // Keywords
    setMeta("keywords", product.meta_keywords || "");

    // Robots
    setMeta("robots", "index, follow");

    // Open Graph
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    const ogImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/og-image?type=product&slug=${encodeURIComponent(product.slug)}`;
    setMeta("og:image", ogImageUrl, "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");
    setMeta("og:type", "product", "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImageUrl);
    // Canonical URL
    if (typeof window !== "undefined") {
      setLink("canonical", `${window.location.origin}/product/${product.slug}`);
    }

    // JSON-LD Product Schema
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: description || product.name,
      image: product.thumbnail || "",
      offers: {
        "@type": "Offer",
        price: product.price || 0,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      aggregateRating: product.avg_rating
        ? {
            "@type": "AggregateRating",
            ratingValue: product.avg_rating,
            reviewCount: product.review_count || 0,
          }
        : undefined,
    };

    // Remove undefined fields
    if (!jsonLd.aggregateRating) {
      delete jsonLd.aggregateRating;
    }

    setJsonLd(JSON.stringify(jsonLd));

    // Cleanup
    return () => {
      const script = document.querySelector('script[data-seo-jsonld-product]');
      if (script) script.remove();
    };
  }, [product]);
};
