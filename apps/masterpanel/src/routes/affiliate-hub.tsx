import { createFileRoute } from "@orizino/shared/lib/router-compat";
import AffiliateHubShell from "@/src/app/affiliate-hub-shell";
import { redirectIfUnauthenticated } from "@/src/lib/auth-guard";

export const Route = createFileRoute("/affiliate-hub")({
  beforeLoad: redirectIfUnauthenticated,
  component: AffiliateHubShell,
});
// code:4ce0
