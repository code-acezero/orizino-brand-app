import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminOfflineOrders";

export const Route = createFileRoute("/sales/offline-orders")({
  component: Page,
});
