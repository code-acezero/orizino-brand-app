import { createFileRoute, redirect } from "@orizino/shared/lib/router-compat";

export const Route = createFileRoute("/_main/home")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
// code:4ce0
