import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/ProfilePage";

export const Route = createFileRoute("/_main/profile")({
  head: () => ({
    meta: [
      { title: "Your Account — Orizino" },
      { name: "description", content: "Manage your orders, addresses, and account details." },
      { property: "og:title", content: "Your Account — Orizino" },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
      { property: "og:url", content: "/profile" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "/profile" }],
  }),
  component: Page,
});
// code:4ce0
