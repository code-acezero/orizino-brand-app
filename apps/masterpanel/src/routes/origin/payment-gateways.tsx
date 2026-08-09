import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminPaymentGateways";

export const Route = createFileRoute("/origin/payment-gateways")({
  component: Page,
});
// code:4ce0
