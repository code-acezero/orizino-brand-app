import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminEmailCampaignEditor";

export const Route = createFileRoute("/email/campaigns/$id")({
  component: Page,
});
// code:4ce0
