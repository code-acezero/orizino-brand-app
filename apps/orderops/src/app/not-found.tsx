import { Suspense } from "react";
import NotFound from "@/_pages/NotFound";

export default function NotFoundPageRoute() {
  return (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  );
}
