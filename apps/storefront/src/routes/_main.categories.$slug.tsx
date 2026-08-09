import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/CategoryPage";

export const Route = createFileRoute("/_main/categories/$slug")({
  head: ({ params }) => {
    const label = params.slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    const title = `${label} — Orizino`;
    const description = `Shop the ${label} collection at Orizino. Curated premium pieces, elevated essentials.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
        { property: "og:description", content: description },
        { property: "og:url", content: `/categories/${params.slug}` },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: `/categories/${params.slug}` }],
    };
  },
  component: Page,
});
// code:4ce0
