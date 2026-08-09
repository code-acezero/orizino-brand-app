import { createFileRoute, Outlet } from "@orizino/shared/lib/router-compat";
import MainShell from "@/src/app/main-shell";

export const Route = createFileRoute("/_main")({
  component: () => (
    <MainShell>
      <Outlet />
    </MainShell>
  ),
});
// code:4ce0
