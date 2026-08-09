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
  const existing = document.querySelector('script[data-seo-jsonld-category]');
  if (existing) existing.remove();
  if (!json) return;
  try {
    JSON.parse(json); // validate
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-jsonld-category", "true");
    script.textContent = json;
    document.head.appendChild(script);
  } catch {
    // invalid JSON-LD, skip
  }
};

/**
 * Hook that applies SEO metadata for category pages.
 * Uses category-specific meta_title, meta_description, and generates JSON-LD breadcrumb/collection data.
 */
export const useCategorySeoMeta = (category: Category | undefined) => {
  useEffect(() => {
    if (!category) {
      document.title = "Category | Store";
      return;
    }

    // Title
    const title = category.meta_title || category.name;
    document.title = `${title} | Store`;

    // Meta description
    const description = category.meta_description || category.description || "";
    setMeta("description", description);

    // Keywords
    setMeta("keywords", category.meta_keywords || "");

    // Robots
    setMeta("robots", "index, follow");

    // Open Graph
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    const ogImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/og-image?type=category&slug=${encodeURIComponent(category.slug)}`;
    setMeta("og:image", ogImageUrl, "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");
    setMeta("og:type", "website", "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImageUrl);

    if (typeof window !== "undefined") {
      setLink("canonical", `${window.location.origin}/categories/${category.slug}`);
    }

    // JSON-LD Collection/Category Schema
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: category.name,
      description: description || category.name,
      image: category.image_url || "",
      url: typeof window !== "undefined" ? `${window.location.origin}/categories/${category.slug}` : "",
    };

    setJsonLd(JSON.stringify(jsonLd));

    // Cleanup
    return () => {
      const script = document.querySelector('script[data-seo-jsonld-category]');
      if (script) script.remove();
    };
  }, [category]);
};
