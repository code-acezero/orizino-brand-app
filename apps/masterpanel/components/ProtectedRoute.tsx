"use client";
import React from "react";
import { Navigate, useLocation } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import SectionLoader from "@/components/loaders/SectionLoader";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Inline styles (not Tailwind classes) here on purpose: on a hard reload
  // this is the very first thing painted, before app.css has necessarily
  // finished loading. Centering via a Tailwind class would render at the
  // default top-left flow position for a frame and then jump to center
  // once the stylesheet applied — inline styles apply immediately.
  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          zIndex: 9999,
        }}
      >
        <SectionLoader tone="platinum" size={56} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
// code:4ce0
