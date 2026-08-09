import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/LiveTrackingPage";

export const Route = createFileRoute("/_main/orders/$id/track")({
  head: ({ params }) => ({
    meta: [
      { title: `Track order #${params.id} — Orizino` },
      { property: "og:title", content: `Track order #${params.id} — Orizino` },
      { property: "og:url", content: `/orders/${params.id}/track` },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: `/orders/${params.id}/track` }],
  }),
  component: Page,
});
// code:4ce0
