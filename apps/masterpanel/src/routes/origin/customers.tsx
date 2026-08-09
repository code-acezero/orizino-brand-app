import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminCustomers";

export const Route = createFileRoute("/origin/customers")({
  component: Page,
});
// code:4ce0
