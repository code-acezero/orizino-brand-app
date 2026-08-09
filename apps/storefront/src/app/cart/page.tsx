import { Suspense } from "react";
import CartPage from "@/_pages/CartPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CartPage />
    </Suspense>
  );
}
