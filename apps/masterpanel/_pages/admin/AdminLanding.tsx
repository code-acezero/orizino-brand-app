"use client";
import React from "react";
import { useAdminRole } from "@/components/AdminRoute";
import { useStaffSections } from "@/hooks/use-staff-sections";
import MasterPanel from "./MasterPanel";
import ControlPanel from "./ControlPanel";

/**
 * AdminLanding — decides which panel to render for the signed-in user.
 *
 *   • Master admin (founder / role='admin')  →  MasterPanel  (full library)
 *   • Everyone else                          →  ControlPanel (scoped view)
 */
export default function AdminLanding() {
  const role = useAdminRole();
  const { data: staff, isLoading } = useStaffSections();

  const isMasterAdmin = role === "admin" || !!staff?.isAdmin;

  if (isLoading && !staff) {
    return <div className="min-h-[40vh]" />;
  }

  return isMasterAdmin ? <MasterPanel /> : <ControlPanel />;
}
// code:4ce0
