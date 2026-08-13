import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminBrandHomeDocs";

export const Route = createFileRoute("/brand/docs")({
  component: Page,
});
