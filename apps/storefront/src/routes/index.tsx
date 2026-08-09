import { createFileRoute } from "@orizino/shared/lib/router-compat";
import MainShell from "@/src/app/main-shell";
import Page from "@/_pages/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Orizino — Premium & Luxurious Fashion" },
      {
        name: "description",
        content:
          "Shop Orizino: curated premium menswear, womenswear, and accessories. Elevated essentials designed for everyday luxury.",
      },
      { property: "og:title", content: "Orizino — Premium & Luxurious Fashion" },
        { property: "og:image", content: "/og-default.jpg" },
        { name: "twitter:image", content: "/og-default.jpg" },
      {
        property: "og:description",
        content:
          "Shop Orizino: curated premium menswear, womenswear, and accessories. Elevated essentials designed for everyday luxury.",
      },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: () => (
    <MainShell>
      <Page />
    </MainShell>
  ),
});
// code:4ce0
