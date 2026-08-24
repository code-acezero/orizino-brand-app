import { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://brand.orizino.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/lookbook",
    "/news",
    "/products",
    "/docs",
    "/scanner-info",
    "/track",
    "/privacy",
    "/terms",
    "/refund",
    "/cookies",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));
}
