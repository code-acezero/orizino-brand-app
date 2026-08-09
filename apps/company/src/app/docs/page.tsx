import { Suspense } from "react";
import DocsPage from "@/_pages/DocsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DocsPage />
    </Suspense>
  );
}
