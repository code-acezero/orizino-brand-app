"use client";
import React from "react";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import AdminStorefrontAppearance from "./AdminStorefrontAppearance";

const AdminAppearance: React.FC = () => {
  useSeoMeta("Appearance", "Typography & layout for every surface");

  return (
    <div className="max-w-7xl mx-auto">
      <AdminStorefrontAppearance />
    </div>
  );
};

export default AdminAppearance;
