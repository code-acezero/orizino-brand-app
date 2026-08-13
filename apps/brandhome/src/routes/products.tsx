import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/ProductHighlightsPage";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Product Highlights — Orizino" },
      {
        name: "description",
        content: "Handpicked pieces from our latest collections. Premium quality, impeccable craft.",
      },
      { property: "og:title", content: "Product Highlights — Orizino" },
      { property: "og:description", content: "Handpicked pieces from our latest collections by Orizino." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Page,
});
// code:4ce0
