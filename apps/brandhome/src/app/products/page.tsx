import { Suspense } from "react";
import ProductHighlightsPage from "@/_pages/ProductHighlightsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductHighlightsPage />
    </Suspense>
  );
}
