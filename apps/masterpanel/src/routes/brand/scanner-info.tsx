import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminBrandHomeScanner";

export const Route = createFileRoute("/brand/scanner-info")({
  component: Page,
});
