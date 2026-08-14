"use client";
import React from "react";
import { useSearch, useNavigate } from "@/lib/router-compat";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import {
  Palette,
  Layers,
  User,
  Lock,
} from "lucide-react";
import AdminStorefrontAppearance from "./AdminStorefrontAppearance";
import AdminProfileAppearance from "./AdminProfileAppearance";
import AdminAuthAppearance from "./AdminAuthAppearance";
import ProductDetailLayoutPanel from "@/components/admin/ProductDetailLayoutPanel";

type TabKey = "storefront" | "product" | "profile" | "auth";
const VALID: TabKey[] = ["storefront", "product", "profile", "auth"];

const TAB_CONFIGS: { id: TabKey; label: string; icon: React.ComponentType<any>; badge?: string }[] = [
  { id: "storefront", label: "Storefront & Typography", icon: Palette, badge: "Master" },
  { id: "product", label: "Product Details & Gallery", icon: Layers },
  { id: "profile", label: "Profile & Settings", icon: User },
  { id: "auth", label: "Sign-in / Sign-up", icon: Lock },
];

const AdminAppearance: React.FC = () => {
  useSeoMeta("Appearance", "Typography & layout for every surface");
  const navigate = useNavigate();
  const search = useSearch() as { tab?: string };
  const tab: TabKey = VALID.includes(search.tab as TabKey) ? (search.tab as TabKey) : "storefront";

  const handleTabChange = (v: string) => {
    navigate({ to: "/brand/appearance", search: { tab: v } as any, replace: true });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ── CLEAN, COMPACT, ELEGANT TAB SWITCHER ── */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-secondary/30 border border-border/50 shadow-xs overflow-x-auto scrollbar-none">
        {TAB_CONFIGS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`relative flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? "bg-card text-foreground shadow-xs border border-border/60 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span>{t.label}</span>
              {t.badge && (
                <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="hidden">
          <TabsTrigger value="storefront">Storefront</TabsTrigger>
          <TabsTrigger value="product">Product Details</TabsTrigger>
          <TabsTrigger value="profile">Profile &amp; Settings</TabsTrigger>
          <TabsTrigger value="auth">Sign-in / Sign-up</TabsTrigger>
        </TabsList>

        <TabsContent value="storefront" className="mt-0 focus-visible:outline-none">
          <AdminStorefrontAppearance />
        </TabsContent>
        <TabsContent value="product" className="mt-0 focus-visible:outline-none">
          <ProductDetailLayoutPanel />
        </TabsContent>
        <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
          <AdminProfileAppearance />
        </TabsContent>
        <TabsContent value="auth" className="mt-0 focus-visible:outline-none">
          <AdminAuthAppearance />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAppearance;
