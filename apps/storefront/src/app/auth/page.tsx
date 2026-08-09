import { Suspense } from "react";
import AuthPage from "@/_pages/AuthPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}
