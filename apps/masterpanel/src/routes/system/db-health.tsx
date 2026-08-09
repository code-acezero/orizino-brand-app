import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminDbHealth";

export const Route = createFileRoute("/system/db-health")({
  component: Page,
});
// code:4ce0
