import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminEmployees";

export const Route = createFileRoute("/origin/employees")({
  component: Page,
});
// code:4ce0
