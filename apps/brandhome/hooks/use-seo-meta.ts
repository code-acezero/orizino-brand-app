"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SeoData {
  title?: string;
  description?: string;
  keywords?: string;
  og_title?: string;
  og_description?: string;
  canonical_url?: string;
  robots?: string;
  structured_data?: string;
}

interface GlobalSeoData {
  site_title_suffix?: string;
  default_og_image?: string;
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
  const existing = document.querySelector('script[data-seo-jsonld]');
  if (existing) existing.remove();
  if (!json) return;
  try {
    JSON.parse(json); // validate
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-jsonld", "true");
    script.textContent = json;
    document.head.appendChild(script);
  } catch {
    // invalid JSON-LD, skip
  }
};

/**
 * Hook that applies saved SEO settings for a given page ID.
 * Falls back to the provided defaultTitle if no SEO title is configured.
 */
export const useSeoMeta = (pageId: string, defaultTitle: string) => {
  const { data: seoSettings } = useQuery({
    queryKey: ["site-seo-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["seo_pages", "seo_global"]);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!seoSettings) {
      document.title = defaultTitle;
      return;
    }

    const pagesRow = seoSettings.find((s) => s.key === "seo_pages");
    const globalRow = seoSettings.find((s) => s.key === "seo_global");

    const pageSeo: SeoData = (pagesRow?.value as any)?.value?.[pageId] ?? {};
    const globalSeo: GlobalSeoData = (globalRow?.value as any)?.value ?? {};

    // Title
    const suffix = globalSeo.site_title_suffix || "";
    document.title = pageSeo.title ? `${pageSeo.title}${suffix}` : defaultTitle;

    // Meta description
    setMeta("description", pageSeo.description || "");

    // Keywords
    setMeta("keywords", pageSeo.keywords || "");

    // Robots
    setMeta("robots", pageSeo.robots || "index, follow");

    // Open Graph
    setMeta("og:title", pageSeo.og_title || pageSeo.title || defaultTitle, "property");
    setMeta("og:description", pageSeo.og_description || pageSeo.description || "", "property");
    if (globalSeo.default_og_image) {
      setMeta("og:image", globalSeo.default_og_image, "property");
    }
    setMeta("og:type", "website", "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", pageSeo.og_title || pageSeo.title || defaultTitle);
    setMeta("twitter:description", pageSeo.og_description || pageSeo.description || "");
    if (globalSeo.default_og_image) {
      setMeta("twitter:image", globalSeo.default_og_image);
    }

    if (pageSeo.canonical_url) {
      setLink("canonical", pageSeo.canonical_url);
    }

    // JSON-LD
    setJsonLd(pageSeo.structured_data || "");

    // Cleanup JSON-LD on unmount
    return () => {
      const script = document.querySelector('script[data-seo-jsonld]');
      if (script) script.remove();
    };
  }, [seoSettings, pageId, defaultTitle]);
};
