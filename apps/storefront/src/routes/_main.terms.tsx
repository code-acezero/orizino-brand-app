import { createFileRoute } from "@orizino/shared/lib/router-compat";
import LegalPage from "@/_pages/LegalPage";

export const Route = createFileRoute("/_main/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Orizino" },
      { name: "description", content: "Read the official Terms of Service governing purchases, order processing, and website use at Orizino Co." },
      { property: "og:title", content: "Terms of Service — Orizino" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => <LegalPage slug="terms" />,
});
