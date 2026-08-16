import { Suspense } from "react";
import MasterPanelShell from "../master-shell";

export default function CatchAllPage() {
  return (
    <Suspense fallback={null}>
      <MasterPanelShell />
    </Suspense>
  );
}
