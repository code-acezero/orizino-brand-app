import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/AuthPage";

export const Route = createFileRoute("/_main/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Orizino" },
      { name: "description", content: "Sign in or create your Orizino account." },
      { property: "og:title", content: "Sign in — Orizino" },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
      { property: "og:url", content: "/auth" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: Page,
});
// code:4ce0
