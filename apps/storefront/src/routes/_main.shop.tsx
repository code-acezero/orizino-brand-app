import { createFileRoute, redirect } from "@orizino/shared/lib/router-compat";

export const Route = createFileRoute("/_main/shop")({
  beforeLoad: () => {
    throw redirect({ to: "/inventory" });
  },
});
// code:4ce0
