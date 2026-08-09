import { Suspense } from "react";
import NotFound from "@/_pages/NotFound";

export default function NotFoundPage() {
  return (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  );
}
