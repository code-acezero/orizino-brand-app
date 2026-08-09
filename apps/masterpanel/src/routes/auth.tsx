import { createFileRoute } from "@orizino/shared/lib/router-compat";
import AdminAuthPage from "@/_pages/AdminAuthPage";

export const Route = createFileRoute("/auth")({
  component: AdminAuthPage,
});
// code:4ce0
