import { createFileRoute, Outlet } from "@orizino/shared/lib/router-compat";
import SectionShell from "@/components/admin/SectionShell";
import { redirectIfUnauthenticated } from "@/src/lib/auth-guard";

export const Route = createFileRoute("/master")({
  beforeLoad: redirectIfUnauthenticated,
  component: () => (
    <SectionShell>
      <Outlet />
    </SectionShell>
  ),
});
// code:4ce0
