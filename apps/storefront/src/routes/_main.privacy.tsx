import { createFileRoute } from "@orizino/shared/lib/router-compat";
import LegalPage from "@/_pages/LegalPage";

export const Route = createFileRoute("/_main/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Orizino" },
      { name: "description", content: "Learn how Orizino protects your personal data, payment security, and privacy rights." },
      { property: "og:title", content: "Privacy Policy — Orizino" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: () => <LegalPage slug="privacy" />,
});
