"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@orizino/supabase/client";

export interface SeoData {
  title?: string;
  description?: string;
  keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  canonical_url?: string;
  robots?: string;
  structured_data?: string | object;
}

export interface GlobalSeoData {
  site_title_suffix?: string;
  default_og_image?: string;
  brand_name?: string;
  google_site_verification?: string;
  bing_site_verification?: string;
  pinterest_verification?: string;
  yandex_verification?: string;
  baidu_verification?: string;
  facebook_domain_verification?: string;
  custom_head_code?: string;
}

const setMeta = (name: string, content: string, attr = "name") => {
  if (!content && content !== "") return;
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
    el.setAttribute(rel, rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const setJsonLd = (jsonInput: string | object | undefined) => {
  const existing = document.querySelector("script[data-seo-jsonld]");
  if (existing) existing.remove();
  if (!jsonInput) return;

  try {
    const raw = typeof jsonInput === "string" ? jsonInput : JSON.stringify(jsonInput);
    JSON.parse(raw); // validate
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-jsonld", "true");
    script.textContent = raw;
    document.head.appendChild(script);
  } catch {
    // invalid JSON-LD, skip
  }
};

/**
 * Enterprise SEO hook that applies saved SEO settings for a given page ID.
 * Falls back to the provided defaultTitle if no SEO title is configured.
 */
export const useSeoMeta = (pageId: string, defaultTitle: string, appId: "storefront" | "brandhome" | "explore" = "storefront") => {
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

    const rawPagesVal = (pagesRow?.value as any)?.value || (pagesRow?.value as any) || {};
    const rawGlobalVal = (globalRow?.value as any)?.value || (globalRow?.value as any) || {};

    // App-wise or root resolution
    const appPages = rawPagesVal[appId] || rawPagesVal;
    const pageSeo: SeoData = appPages[pageId] ?? rawPagesVal[pageId] ?? {};

    const appGlobal = rawGlobalVal[appId] || rawGlobalVal;
    const globalSeo: GlobalSeoData = typeof appGlobal === "object" ? appGlobal : rawGlobalVal;

    // 1. Document Title
    const suffix = globalSeo.site_title_suffix || (globalSeo.site_title_suffix === "" ? "" : " | ORIZINO");
    const pageTitle = pageSeo.title?.trim() || defaultTitle;
    document.title = pageSeo.title ? `${pageTitle}${suffix}` : defaultTitle;

    // 2. Meta description & Keywords
    setMeta("description", pageSeo.description || "Discover premium luxury streetwear and oversized apparel by ORIZINO.");
    setMeta("keywords", pageSeo.keywords || "luxury streetwear, oversized hoodie, heavy cotton tee, orizino");

    // 3. Robots Directives
    setMeta("robots", pageSeo.robots || "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");

    // 4. Open Graph Tags
    const ogTitle = pageSeo.og_title || pageTitle;
    const ogDesc = pageSeo.og_description || pageSeo.description || "Discover luxury streetwear essentials by ORIZINO.";
    const ogImage = pageSeo.og_image || globalSeo.default_og_image || "https://shop.orizino.com/og-image.jpg";

    setMeta("og:site_name", globalSeo.brand_name || "ORIZINO", "property");
    setMeta("og:title", ogTitle, "property");
    setMeta("og:description", ogDesc, "property");
    setMeta("og:image", ogImage, "property");
    setMeta("og:type", "website", "property");
    if (typeof window !== "undefined") {
      setMeta("og:url", window.location.href, "property");
    }

    // 5. Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", ogTitle);
    setMeta("twitter:description", ogDesc);
    setMeta("twitter:image", ogImage);
    setMeta("twitter:site", "@orizinobrand");

    // 6. Canonical Link
    const canonical = pageSeo.canonical_url || (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "");
    if (canonical) {
      setLink("canonical", canonical);
    }

    // 7. Search Engine Verification Tags
    if (globalSeo.google_site_verification) {
      setMeta("google-site-verification", globalSeo.google_site_verification);
    }
    if (globalSeo.bing_site_verification) {
      setMeta("msvalidate.01", globalSeo.bing_site_verification);
    }
    if (globalSeo.pinterest_verification) {
      setMeta("p:domain_verify", globalSeo.pinterest_verification);
    }
    if (globalSeo.yandex_verification) {
      setMeta("yandex-verification", globalSeo.yandex_verification);
    }
    if (globalSeo.baidu_verification) {
      setMeta("baidu-site-verification", globalSeo.baidu_verification);
    }
    if (globalSeo.facebook_domain_verification) {
      setMeta("facebook-domain-verification", globalSeo.facebook_domain_verification);
    }

    // 8. JSON-LD Structured Data
    setJsonLd(pageSeo.structured_data);

    // Cleanup JSON-LD on unmount
    return () => {
      const script = document.querySelector("script[data-seo-jsonld]");
      if (script) script.remove();
    };
  }, [seoSettings, pageId, defaultTitle]);
};
