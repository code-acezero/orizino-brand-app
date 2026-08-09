import { createFileRoute } from "@orizino/shared/lib/router-compat";
import LegalPage from "@/_pages/LegalPage";

export const Route = createFileRoute("/_main/refund")({
  head: () => ({
    meta: [
      { title: "Return & Refund Policy — Orizino" },
      { name: "description", content: "Understand Orizino 7-day return, exchange, and refund policy. Simple, fast, and transparent customer guarantee." },
      { property: "og:title", content: "Return & Refund Policy — Orizino" },
      { property: "og:url", content: "/refund" },
    ],
    links: [{ rel: "canonical", href: "/refund" }],
  }),
  component: () => <LegalPage slug="returns" />,
});
