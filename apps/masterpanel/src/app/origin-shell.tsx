"use client";
import React from "react";
import AdminRoute from "@/components/AdminRoute";
import AdminLayout from "@/components/admin/AdminLayout";

export default function OriginShell({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={null}>
      <AdminRoute>
        <AdminLayout>
          <React.Suspense fallback={null}>
            {children}
          </React.Suspense>
        </AdminLayout>
      </AdminRoute>
    </React.Suspense>
  );
}
// code:4ce0
