import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/DocsPage";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — Orizino" },
      {
        name: "description",
        content: "Documentation, references, and creative case studies from Orizino.",
      },
      { property: "og:title", content: "Docs — Orizino" },
      { property: "og:description", content: "Documentation and case studies by Orizino." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Page,
});
