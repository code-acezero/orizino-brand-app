import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminOrderReasons";

export const Route = createFileRoute("/settings-ai/order-reasons")({
  component: Page,
});
