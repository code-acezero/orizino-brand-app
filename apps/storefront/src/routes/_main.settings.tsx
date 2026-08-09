import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/SettingsPage";

export const Route = createFileRoute("/_main/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Orizino" },
      { property: "og:url", content: "/settings" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "/settings" }],
  }),
  component: Page,
});
// code:4ce0
