import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/OrdersPage";

export const Route = createFileRoute("/_main/orders/")({
  head: () => ({
    meta: [
      { title: "Your Orders — Orizino" },
      { name: "description", content: "Track and manage your recent Orizino orders." },
      { property: "og:title", content: "Your Orders — Orizino" },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
      { property: "og:url", content: "/orders" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "/orders" }],
  }),
  component: Page,
});
// code:4ce0
