import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/WishlistPage";

export const Route = createFileRoute("/_main/wishlist")({
  head: () => ({
    meta: [
      { title: "Your Wishlist — Orizino" },
      { name: "description", content: "Products you've saved to buy later." },
      { property: "og:title", content: "Your Wishlist — Orizino" },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
      { property: "og:url", content: "/wishlist" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "/wishlist" }],
  }),
  component: Page,
});
// code:4ce0
