"use client";
import { useEffect } from "react";

interface Product {
  name: string;
  sku?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  thumbnail?: string;
  short_description?: string;
  slug: string;
  price?: number;
  compare_at_price?: number;
  avg_rating?: number | null;
  review_count?: number | null;
  brand?: string;
  category_name?: string;
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

const setJsonLd = (json: string, id = "product") => {
  const existing = document.querySelector(`script[data-seo-jsonld-${id}]`);
  if (existing) existing.remove();
  if (!json) return;
  try {
    JSON.parse(json); // validate
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute(`data-seo-jsonld-${id}`, "true");
    script.textContent = json;
    document.head.appendChild(script);
  } catch {
    // invalid JSON-LD, skip
  }
};

/**
 * SEO hook for product detail pages.
 * Generates rich meta tags, Open Graph, Twitter Card, and JSON-LD Product + BreadcrumbList structured data.
 */
export const useProductSeoMeta = (product: Product | undefined) => {
  useEffect(() => {
    if (!product) {
      document.title = "Product — ORIZINO";
      return;
    }

    const brand = product.brand || "ORIZINO";

    // Title — brand-suffixed
    const title = product.meta_title || product.name;
    document.title = `${title} — ORIZINO`;

    // Meta description — rich, keyword-aware
    const description =
      product.meta_description ||
      product.short_description ||
      `Shop ${product.name} by ${brand}. Premium luxury fashion from ORIZINO — Beyond Simplicity.`;
    setMeta("description", description);

    // Keywords
    const keywords =
      product.meta_keywords ||
      `${product.name}, ${brand}, ORIZINO, luxury fashion, premium streetwear, buy online`;
    setMeta("keywords", keywords);

    // Robots
    setMeta("robots", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");

    // Author & Theme
    setMeta("author", "ORIZINO");

    // Open Graph
    setMeta("og:title", `${title} — ORIZINO`, "property");
    setMeta("og:description", description, "property");
    setMeta("og:site_name", "ORIZINO", "property");
    setMeta("og:type", "product", "property");
    setMeta("og:locale", "en_US", "property");

    const ogImageUrl = product.thumbnail
      ? product.thumbnail
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/og-image?type=product&slug=${encodeURIComponent(product.slug)}`;
    setMeta("og:image", ogImageUrl, "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");
    setMeta("og:image:alt", `${product.name} — ORIZINO`, "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", `${title} — ORIZINO`);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImageUrl);
    setMeta("twitter:image:alt", `${product.name} — ORIZINO`);

    // Canonical URL
    if (typeof window !== "undefined") {
      const canonical = `${window.location.origin}/product/${product.slug}`;
      setLink("canonical", canonical);
      setMeta("og:url", canonical, "property");
    }

    // JSON-LD Product Schema
    const productUrl = typeof window !== "undefined" ? `${window.location.origin}/product/${product.slug}` : "";
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: description || product.name,
      image: product.thumbnail || "",
      url: productUrl,
      brand: {
        "@type": "Brand",
        name: brand,
      },
      offers: {
        "@type": "Offer",
        price: product.price || 0,
        priceCurrency: "BDT",
        availability: "https://schema.org/InStock",
        url: productUrl,
        seller: {
          "@type": "Organization",
          name: "ORIZINO",
        },
      },
    };

    if (product.sku) {
      jsonLd.sku = product.sku;
    }

    if (product.avg_rating && product.review_count) {
      jsonLd.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: product.avg_rating,
        reviewCount: product.review_count,
      };
    }

    setJsonLd(JSON.stringify(jsonLd), "product");

    // JSON-LD BreadcrumbList
    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: typeof window !== "undefined" ? window.location.origin : "",
        },
        ...(product.category_name
          ? [
              {
                "@type": "ListItem",
                position: 2,
                name: product.category_name,
                item: typeof window !== "undefined" ? `${window.location.origin}/categories` : "",
              },
            ]
          : []),
        {
          "@type": "ListItem",
          position: product.category_name ? 3 : 2,
          name: product.name,
          item: productUrl,
        },
      ],
    };
    setJsonLd(JSON.stringify(breadcrumbLd), "breadcrumb");

    // Cleanup
    return () => {
      document.querySelector("script[data-seo-jsonld-product]")?.remove();
      document.querySelector("script[data-seo-jsonld-breadcrumb]")?.remove();
    };
  }, [product]);
};
