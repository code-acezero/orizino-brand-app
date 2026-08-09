import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/ResetPasswordPage";

export const Route = createFileRoute("/_main/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Orizino" },
      { property: "og:url", content: "/reset-password" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "/reset-password" }],
  }),
  component: Page,
});
// code:4ce0
