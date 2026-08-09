import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminAuditLog";

export const Route = createFileRoute("/team/audit-log")({
  component: Page,
});
// code:4ce0
