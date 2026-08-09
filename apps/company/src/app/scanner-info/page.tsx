import { Suspense } from "react";
import ScannerInfoPage from "@/_pages/ScannerInfoPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ScannerInfoPage />
    </Suspense>
  );
}
