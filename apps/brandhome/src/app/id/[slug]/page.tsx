import { Suspense } from "react";
import EmployeeIdentityPage from "@/_pages/EmployeeIdentityPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EmployeeIdentityPage />
    </Suspense>
  );
}
