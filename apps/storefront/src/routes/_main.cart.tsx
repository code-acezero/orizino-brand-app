import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/CartPage";

export const Route = createFileRoute("/_main/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Orizino" },
      { name: "description", content: "Review the items in your cart and check out securely." },
      { property: "og:title", content: "Your Cart — Orizino" },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
      { property: "og:url", content: "/cart" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "/cart" }],
  }),
  component: Page,
});
// code:4ce0
