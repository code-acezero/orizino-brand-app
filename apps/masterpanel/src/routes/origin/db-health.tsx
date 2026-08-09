import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminDbHealth";

export const Route = createFileRoute("/origin/db-health")({
  component: Page,
});
// code:4ce0
