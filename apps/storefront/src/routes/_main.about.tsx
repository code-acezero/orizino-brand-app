import { createFileRoute } from "@orizino/shared/lib/router-compat";
import AboutPage from "@/_pages/AboutPage";

export const Route = createFileRoute("/_main/about")({
  head: () => ({
    meta: [
      { title: "Story & Craftsmanship — Orizino Company" },
      { property: "og:title", content: "Story & Craftsmanship — Orizino Company" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});
