import { createFileRoute } from "@orizino/shared/lib/router-compat";
import LegalPage from "@/_pages/LegalPage";

export const Route = createFileRoute("/_main/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Orizino" },
      { name: "description", content: "Learn how Orizino uses cookies to remember your cart, theme, currency preferences, and deliver a smooth browsing experience." },
      { property: "og:title", content: "Cookie Policy — Orizino" },
      { property: "og:url", content: "/cookies" },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
  }),
  component: () => <LegalPage slug="cookies" />,
});
