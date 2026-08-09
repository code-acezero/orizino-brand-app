import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/GuestCheckoutPage";

export const Route = createFileRoute("/_main/checkout-guest")({
  head: () => ({
    meta: [
      { title: "Guest Checkout — Orizino" },
      { name: "description", content: "Complete your Orizino order without an account." },
      { property: "og:title", content: "Guest Checkout — Orizino" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "/checkout-guest" }],
  }),
  component: Page,
});
