import { Suspense } from "react";
import NewsPage from "@/_pages/NewsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NewsPage />
    </Suspense>
  );
}
