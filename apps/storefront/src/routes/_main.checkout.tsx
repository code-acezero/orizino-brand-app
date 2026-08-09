import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/CheckoutPage";

export const Route = createFileRoute("/_main/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Orizino" },
      { name: "description", content: "Complete your order securely at Orizino." },
      { property: "og:title", content: "Checkout — Orizino" },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
      { property: "og:url", content: "/checkout" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "/checkout" }],
  }),
  component: Page,
});
// code:4ce0
