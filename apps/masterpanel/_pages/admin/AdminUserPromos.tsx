"use client";
import React, { useEffect } from "react";
import AdminCoupons from "@/_pages/admin/AdminCoupons";

export default function AdminUserPromos() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/sales/user-promos") {
      window.history.replaceState(null, "", "/sales/coupons?tab=user-promos");
    }
  }, []);

  return <AdminCoupons />;
}
