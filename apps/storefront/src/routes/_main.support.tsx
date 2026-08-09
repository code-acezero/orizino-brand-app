import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/SupportPage";

export const Route = createFileRoute("/_main/support")({
  head: () => ({
    meta: [
      { title: "Support — Orizino" },
      {
        name: "description",
        content: "Get help with orders, returns, and product questions. Contact Orizino support.",
      },
      { property: "og:title", content: "Support — Orizino" },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
      {
        property: "og:description",
        content: "Get help with orders, returns, and product questions.",
      },
      { property: "og:url", content: "/support" },
    ],
    links: [{ rel: "canonical", href: "/support" }],
  }),
  component: Page,
});
// code:4ce0
