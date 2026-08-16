"use client";

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminOrders from "./AdminOrders";

export default function AdminReturns() {
  const navigate = useNavigate();

  useEffect(() => {
    // If accessed via /sales/returns, update URL to tab=returns smoothly
    const search = window.location.search;
    if (!search.includes("tab=")) {
      navigate("/sales/orders?tab=returns", { replace: true });
    }
  }, [navigate]);

  return <AdminOrders />;
}
