import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminScannerContent";

export const Route = createFileRoute("/sales/scanner-content")({
  component: Page,
});
