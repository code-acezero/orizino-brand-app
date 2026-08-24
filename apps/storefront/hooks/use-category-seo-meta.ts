"use client";
import { useEffect } from "react";

interface Category {
  name: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  slug: string;
  description?: string;
  image_url?: string;
  product_count?: number;
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

const setJsonLd = (json: string, id = "category") => {
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
 * SEO hook for category listing pages.
 * Generates rich meta tags, Open Graph, Twitter Card, and JSON-LD CollectionPage + BreadcrumbList structured data.
 */
export const useCategorySeoMeta = (category: Category | undefined) => {
  useEffect(() => {
    if (!category) {
      document.title = "Collections — ORIZINO";
      return;
    }

    // Title — brand-suffixed
    const title = category.meta_title || `${category.name} Collection`;
    document.title = `${title} — ORIZINO`;

    // Meta description — rich, keyword-aware
    const description =
      category.meta_description ||
      category.description ||
      `Explore the ${category.name} collection by ORIZINO. Premium luxury fashion — From Beyond Ordinary.`;
    setMeta("description", description);

    // Keywords
    const keywords =
      category.meta_keywords ||
      `${category.name}, ORIZINO, luxury fashion, premium streetwear, ${category.name} collection, shop online`;
    setMeta("keywords", keywords);

    // Robots
    setMeta("robots", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");

    // Author
    setMeta("author", "ORIZINO");

    // Open Graph
    setMeta("og:title", `${title} — ORIZINO`, "property");
    setMeta("og:description", description, "property");
    setMeta("og:site_name", "ORIZINO", "property");
    setMeta("og:type", "website", "property");
    setMeta("og:locale", "en_US", "property");

    const ogImageUrl = category.image_url
      ? category.image_url
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/og-image?type=category&slug=${encodeURIComponent(category.slug)}`;
    setMeta("og:image", ogImageUrl, "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");
    setMeta("og:image:alt", `${category.name} — ORIZINO`, "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", `${title} — ORIZINO`);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImageUrl);
    setMeta("twitter:image:alt", `${category.name} — ORIZINO`);

    // Canonical
    if (typeof window !== "undefined") {
      const canonical = `${window.location.origin}/categories/${category.slug}`;
      setLink("canonical", canonical);
      setMeta("og:url", canonical, "property");
    }

    // JSON-LD CollectionPage
    const categoryUrl =
      typeof window !== "undefined" ? `${window.location.origin}/categories/${category.slug}` : "";
    const collectionLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${category.name} — ORIZINO`,
      description: description || category.name,
      image: category.image_url || "",
      url: categoryUrl,
      isPartOf: {
        "@type": "WebSite",
        name: "ORIZINO",
        url: typeof window !== "undefined" ? window.location.origin : "",
      },
    };
    setJsonLd(JSON.stringify(collectionLd), "category");

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
        {
          "@type": "ListItem",
          position: 2,
          name: "Collections",
          item: typeof window !== "undefined" ? `${window.location.origin}/categories` : "",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: category.name,
          item: categoryUrl,
        },
      ],
    };
    setJsonLd(JSON.stringify(breadcrumbLd), "breadcrumb");

    // Cleanup
    return () => {
      document.querySelector("script[data-seo-jsonld-category]")?.remove();
      document.querySelector("script[data-seo-jsonld-breadcrumb]")?.remove();
    };
  }, [category]);
};
