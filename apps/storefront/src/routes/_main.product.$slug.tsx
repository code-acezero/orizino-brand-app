import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/ProductDetailPage";

export const Route = createFileRoute("/_main/product/$slug")({
  head: ({ params }) => {
    const label = params.slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    const title = `${label} — Orizino`;
    const description = `${label}. Discover the details, sizing, and reviews. Free returns on eligible orders.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
        { property: "og:description", content: description },
        { property: "og:url", content: `/product/${params.slug}` },
        { property: "og:type", content: "product" },
      ],
      links: [{ rel: "canonical", href: `/product/${params.slug}` }],
    };
  },
  component: Page,
});
// code:4ce0
