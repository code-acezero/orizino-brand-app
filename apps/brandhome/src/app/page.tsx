import { Suspense } from "react";
import LandingPage from "@/_pages/LandingPage";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  );
}
