"use client";
import React from "react";
import AdminRoute from "@/components/AdminRoute";
import MasterPanelLayout from "@/components/admin/MasterPanelLayout";
import AdminLanding from "@/_pages/admin/AdminLanding";

export default function MasterPanelShell() {
  return (
    <React.Suspense fallback={null}>
      <AdminRoute>
        <MasterPanelLayout>
          <React.Suspense fallback={null}>
            <AdminLanding />
          </React.Suspense>
        </MasterPanelLayout>
      </AdminRoute>
    </React.Suspense>
  );
}
// code:4ce0
