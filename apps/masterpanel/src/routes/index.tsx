import { createFileRoute } from "@orizino/shared/lib/router-compat";
import MasterPanelShell from "@/src/app/master-shell";

export const Route = createFileRoute("/")({
  component: MasterPanelShell,
});
// code:4ce0
