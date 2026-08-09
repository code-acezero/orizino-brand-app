import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/ScannerInfoPage";

export const Route = createFileRoute("/scanner-info")({
  head: () => ({
    meta: [
      { title: "Scanner — Orizino" },
      {
        name: "description",
        content:
          "Verify any Orizino product in seconds. Native browser scanner, no app install, no sign-in required.",
      },
      { property: "og:title", content: "Orizino Scanner — verify any product" },
      {
        property: "og:description",
        content:
          "Scan the tag on any Orizino piece with your phone camera to instantly confirm authenticity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});
