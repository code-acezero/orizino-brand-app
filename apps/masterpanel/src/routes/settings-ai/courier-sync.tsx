import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminCourierSync";

export const Route = createFileRoute("/settings-ai/courier-sync")({
  component: Page,
});
