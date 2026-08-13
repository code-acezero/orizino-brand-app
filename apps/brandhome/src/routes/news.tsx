import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/NewsPage";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News & Updates — Orizino" },
      { name: "description", content: "The latest news, updates, and stories from Orizino." },
      { property: "og:title", content: "News & Updates — Orizino" },
      { property: "og:description", content: "The latest news, updates, and stories from Orizino." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Page,
});
// code:4ce0
