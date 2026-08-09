import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminEmailTemplates";

export const Route = createFileRoute("/email/templates")({
  component: Page,
});
// code:4ce0
