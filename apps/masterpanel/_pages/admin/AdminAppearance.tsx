"use client";
import React from "react";
import { useLocation } from "@/lib/router-compat";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import AdminStorefrontAppearance from "./AdminStorefrontAppearance";
import AdminProfileAppearance from "./AdminProfileAppearance";
import AdminAuthAppearance from "./AdminAuthAppearance";
import ProductDetailLayoutPanel from "@/components/admin/ProductDetailLayoutPanel";

type TabKey = "storefront" | "product" | "profile" | "auth";

const AdminAppearance: React.FC = () => {
  useSeoMeta("Appearance", "Typography & layout for every surface");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const rawTab = searchParams.get("tab");
  const tab: TabKey =
    rawTab === "product" || rawTab === "profile" || rawTab === "auth"
      ? (rawTab as TabKey)
      : "storefront";

  return (
    <div className="max-w-7xl mx-auto">
      {tab === "product" && <ProductDetailLayoutPanel />}
      {tab === "profile" && <AdminProfileAppearance />}
      {tab === "auth" && <AdminAuthAppearance />}
      {tab === "storefront" && <AdminStorefrontAppearance />}
    </div>
  );
};

export default AdminAppearance;
