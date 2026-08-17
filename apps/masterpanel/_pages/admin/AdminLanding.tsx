"use client";
import React from "react";
import { useAdminRole } from "@/components/AdminRoute";
import { useStaffSections } from "@/hooks/use-staff-sections";
import MasterPanel from "./MasterPanel";
import ControlPanel from "./ControlPanel";

import SectionLoader from "@/components/loaders/SectionLoader";

/**
 * AdminLanding — decides which panel to render for the signed-in user.
 *
 *   • Master admin (founder / role='admin')  →  MasterPanel  (full library)
 *   • Everyone else                          →  ControlPanel (scoped view)
 */
export default function AdminLanding() {
  const role = useAdminRole();
  const { data: staff, isLoading } = useStaffSections();

  if (isLoading && !staff && role !== "admin") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <SectionLoader tone="platinum" size={48} />
      </div>
    );
  }

  return <MasterPanel />;
}
// code:4ce0
