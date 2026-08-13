import { Suspense } from "react";
import Providers from "../providers";
import MasterPanelShell from "../master-shell";

export default function CatchAllPage() {
  return (
    <Providers>
      <Suspense fallback={null}>
        <MasterPanelShell />
      </Suspense>
    </Providers>
  );
}
