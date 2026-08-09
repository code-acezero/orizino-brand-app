import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@orizino/shared/lib/router-compat";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const STATIC_PATHS = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/shop", changefreq: "daily", priority: "0.9" },
  { path: "/support", changefreq: "monthly", priority: "0.4" },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const proto = request.headers.get("x-forwarded-proto") ?? "https";
        const host = request.headers.get("host") ?? "";
        const origin = host ? `${proto}://${host}` : "";
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const [products, categories, pages] = await Promise.all([
          sb.from("products").select("slug, updated_at").eq("is_active", true).limit(5000),
          sb.from("categories").select("slug, updated_at").eq("is_active", true).limit(1000),
          sb.from("cms_pages").select("slug, updated_at").eq("is_published", true).limit(500),
        ]);
        const urls: string[] = [];
        const add = (path: string, lastmod?: string, changefreq?: string, priority?: string) => {
          urls.push(
            [
              "  <url>",
              `    <loc>${esc(origin + path)}</loc>`,
              lastmod ? `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : null,
              changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
              priority ? `    <priority>${priority}</priority>` : null,
              "  </url>",
            ]
              .filter(Boolean)
              .join("\n")
          );
        };
        STATIC_PATHS.forEach((p) => add(p.path, undefined, p.changefreq, p.priority));
        (products.data ?? []).forEach((p: any) =>
          add(`/product/${p.slug}`, p.updated_at ?? undefined, "weekly", "0.8")
        );
        (categories.data ?? []).forEach((c: any) =>
          add(`/categories/${c.slug}`, c.updated_at ?? undefined, "weekly", "0.7")
        );
        (pages.data ?? []).forEach((p: any) =>
          add(`/page/${p.slug}`, p.updated_at ?? undefined, "monthly", "0.5")
        );
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
// code:4ce0
