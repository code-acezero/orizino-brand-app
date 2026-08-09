import { createFileRoute } from "@orizino/shared/lib/router-compat";
import PerAppBranding from "@/components/admin/PerAppBranding";

export const Route = createFileRoute("/brand/per-app")({
  component: () => (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <PerAppBranding />
    </div>
  ),
});
