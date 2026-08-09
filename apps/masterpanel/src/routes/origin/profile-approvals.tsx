import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminProfileApprovals";

export const Route = createFileRoute("/origin/profile-approvals")({
  component: Page,
});
