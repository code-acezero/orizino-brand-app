import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/dashboards/EmailDashboard";

export const Route = createFileRoute("/email/")({
  component: Page,
});
// code:4ce0
