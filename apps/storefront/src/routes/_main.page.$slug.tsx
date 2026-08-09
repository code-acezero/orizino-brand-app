import { createFileRoute, useParams } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/CmsPage";
import AboutPage from "@/_pages/AboutPage";

function PageSlugComponent() {
  const { slug } = useParams<{ slug: string }>();
  if (slug === "about") {
    return <AboutPage />;
  }
  return <Page />;
}

export const Route = createFileRoute("/_main/page/$slug")({
  head: ({ params }) => {
    const label = params.slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${label} — Orizino` },
        { property: "og:title", content: `${label} — Orizino` },
        { property: "og:url", content: `/page/${params.slug}` },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: `/page/${params.slug}` }],
    };
  },
  component: PageSlugComponent,
});
// code:4ce0
