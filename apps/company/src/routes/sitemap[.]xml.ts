import { createFileRoute } from "@orizino/shared/lib/router-compat";
import type {} from "@orizino/shared/lib/server-fn-compat";

const STATIC_PATHS = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "weekly", priority: "0.9" },
  { path: "/news", changefreq: "daily", priority: "0.7" },
  { path: "/docs", changefreq: "monthly", priority: "0.5" },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const proto = request.headers.get("x-forwarded-proto") ?? "https";
        const host = request.headers.get("host") ?? "";
        const origin = host ? `${proto}://${host}` : "";
        const urls = STATIC_PATHS.map((p) =>
          [
            "  <url>",
            `    <loc>${esc(origin + p.path)}</loc>`,
            `    <changefreq>${p.changefreq}</changefreq>`,
            `    <priority>${p.priority}</priority>`,
            "  </url>",
          ].join("\n"),
        );
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
