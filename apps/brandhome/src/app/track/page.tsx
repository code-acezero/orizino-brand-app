import { Suspense } from "react";
import TrackPage from "@/_pages/TrackPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TrackPage />
    </Suspense>
  );
}
