import { Suspense } from "react";
import HomePage from "@/_pages/HomePage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}
