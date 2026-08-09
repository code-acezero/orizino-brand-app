import * as React from "react";
import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/ShopPage";

export const Route = createFileRoute("/_main/inventory")({
  head: () => ({
    meta: [
      { title: "Shop All — Orizino" },
      {
        name: "description",
        content:
          "Browse the full Orizino catalogue. Filter by category, size, and price to find your next favourite piece.",
      },
      { property: "og:title", content: "Shop All — Orizino" },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
      {
        property: "og:description",
        content: "Browse the full Orizino catalogue.",
      },
      { property: "og:url", content: "/inventory" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/inventory" }],
  }),
  component: () => (
    <React.Suspense fallback={null}>
      <Page />
    </React.Suspense>
  ),
});
// code:4ce0
