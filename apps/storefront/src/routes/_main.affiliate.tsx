import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/AffiliatePage";

export const Route = createFileRoute("/_main/affiliate")({
  head: () => ({
    meta: [
      { title: "Affiliate Programme — Orizino" },
      {
        name: "description",
        content: "Earn commission by sharing Orizino with your audience.",
      },
      { property: "og:title", content: "Affiliate Programme — Orizino" },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
      { property: "og:url", content: "/affiliate" },
    ],
    links: [{ rel: "canonical", href: "/affiliate" }],
  }),
  component: Page,
});
// code:4ce0
