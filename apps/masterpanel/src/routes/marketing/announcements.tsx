import { createFileRoute } from "@orizino/shared/lib/router-compat";
import Page from "@/_pages/admin/AdminAnnouncements";

export const Route = createFileRoute("/marketing/announcements")({
  component: Page,
});
// code:4ce0
