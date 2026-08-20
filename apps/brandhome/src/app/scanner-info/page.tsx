import { Suspense } from "react";
import ProductScannerPage from "@/_pages/ProductScannerPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductScannerPage />
    </Suspense>
  );
}
