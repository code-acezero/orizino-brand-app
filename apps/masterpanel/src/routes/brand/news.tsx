import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminBrandHomeNews";

export const Route = createFileRoute("/brand/news")({
  component: Page,
});
