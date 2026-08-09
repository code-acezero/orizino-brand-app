"use client";
import React from "react";
import { useSearch, useNavigate } from "@/lib/router-compat";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import AdminStorefrontAppearance from "./AdminStorefrontAppearance";
import AdminProfileAppearance from "./AdminProfileAppearance";
import AdminAuthAppearance from "./AdminAuthAppearance";
import ProductDetailLayoutPanel from "@/components/admin/ProductDetailLayoutPanel";
import StorefrontLayoutPanel from "@/components/admin/StorefrontLayoutPanel";

type TabKey = "storefront" | "layout" | "product" | "profile" | "auth";
const VALID: TabKey[] = ["storefront", "layout", "product", "profile", "auth"];

const AdminAppearance: React.FC = () => {
  useSeoMeta("Appearance", "Typography & layout for every surface");
  const navigate = useNavigate();
  const search = useSearch() as { tab?: string };
  const tab: TabKey = VALID.includes((search.tab as TabKey)) ? (search.tab as TabKey) : "storefront";

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({ to: "/brand/appearance", search: { tab: v } as any, replace: true })
        }
      >
        <TabsList className="hidden">
          <TabsTrigger value="storefront">Storefront</TabsTrigger>
          <TabsTrigger value="layout">Shop Layout</TabsTrigger>
          <TabsTrigger value="product">Product Details Layout</TabsTrigger>
          <TabsTrigger value="profile">Profile & Settings</TabsTrigger>
          <TabsTrigger value="auth">Sign-in / Sign-up</TabsTrigger>
        </TabsList>
        <TabsContent value="storefront" className="mt-4">
          <AdminStorefrontAppearance />
        </TabsContent>
        <TabsContent value="layout" className="mt-4">
          <StorefrontLayoutPanel />
        </TabsContent>
        <TabsContent value="product" className="mt-4">
          <ProductDetailLayoutPanel />
        </TabsContent>
        <TabsContent value="profile" className="mt-4">
          <AdminProfileAppearance />
        </TabsContent>
        <TabsContent value="auth" className="mt-4">
          <AdminAuthAppearance />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAppearance;
// code:4ce0
