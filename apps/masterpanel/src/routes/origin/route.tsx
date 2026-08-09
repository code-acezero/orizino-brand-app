import { createFileRoute, Outlet } from "@orizino/shared/lib/router-compat";
import OriginShell from "@/src/app/origin-shell";
import { redirectIfUnauthenticated } from "@/src/lib/auth-guard";

export const Route = createFileRoute("/origin")({
  beforeLoad: redirectIfUnauthenticated,
  component: () => (
    <OriginShell>
      <Outlet />
    </OriginShell>
  ),
});
// code:4ce0
