import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminIdentityAudit";

export const Route = createFileRoute("/origin/identity-audit")({
  component: Page,
});
