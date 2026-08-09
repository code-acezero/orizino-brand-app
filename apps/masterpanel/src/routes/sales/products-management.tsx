import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminProductsManagement";

export const Route = createFileRoute("/sales/products-management")({
  component: Page,
});
