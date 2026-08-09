import { Suspense } from "react";
import CheckoutPage from "@/_pages/CheckoutPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CheckoutPage />
    </Suspense>
  );
}
