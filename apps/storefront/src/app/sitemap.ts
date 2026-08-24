import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // revalidate every hour

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shop.orizino.com";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static core routes
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/inventory`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  let productPages: MetadataRoute.Sitemap = [];
  let categoryPages: MetadataRoute.Sitemap = [];

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false },
      });

      // Dynamic product pages
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("slug, updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false });

      if (!prodErr && products) {
        productPages = products.map((p) => ({
          url: `${SITE_URL}/product/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));
      }

      // Dynamic category pages
      const { data: categories, error: catErr } = await supabase
        .from("categories")
        .select("slug, updated_at")
        .order("sort_order", { ascending: true });

      if (!catErr && categories) {
        categoryPages = categories.map((c) => ({
          url: `${SITE_URL}/categories/${c.slug}`,
          lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }));
      }
    } catch {
      // Safe fallback if Supabase cannot be reached during build time
    }
  }

  return [...staticPages, ...productPages, ...categoryPages];
}
