import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminBrandHomeTrack";

export const Route = createFileRoute("/brand/track")({
  component: Page,
});
