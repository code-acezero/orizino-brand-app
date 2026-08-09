import { Suspense } from "react";
import GuestCheckoutPage from "@/_pages/GuestCheckoutPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GuestCheckoutPage />
    </Suspense>
  );
}
