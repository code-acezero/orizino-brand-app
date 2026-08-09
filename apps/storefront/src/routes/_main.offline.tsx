import { createFileRoute } from "@orizino/shared/lib/router-compat";
import { OfflinePage } from "@orizino/shared";

export const Route = createFileRoute("/_main/offline")({
  head: () => ({
    meta: [
      { title: "You're offline — Orizino" },
      { name: "description", content: "No internet connection. Play Snake while you wait." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <OfflinePage homeTo="/" appName="Orizino" />,
});
// code:4ce0
