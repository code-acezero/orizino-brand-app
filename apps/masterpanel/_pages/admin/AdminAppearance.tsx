"use client";
import React from "react";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { MoveHorizontal, Type, ShoppingBag, UserCircle, KeyRound, Layout } from "lucide-react";
import AdminStorefrontAppearance from "./StorefrontThemePage";
import AdminProfileAppearance from "./PublicProfileThemePage";
import AdminAuthAppearance from "./AuthPageThemePage";
import ProductDetailLayoutPanel from "@/components/admin/ProductDetailLayoutPanel";
import MarqueeStripConfigPanel from "@/components/admin/MarqueeStripConfigPanel";

type TabKey = "storefront" | "marquee" | "product" | "profile" | "auth";

const APPEARANCE_TABS: { id: TabKey; label: string; icon: React.ElementType; description: string }[] = [
  { id: "storefront", label: "Storefront Typography", icon: Type, description: "Display & Body typography pairings" },
  { id: "marquee", label: "Marquee Strip Ticker", icon: MoveHorizontal, description: "Ticker phrases, speed & styling" },
  { id: "product", label: "Product Layout", icon: ShoppingBag, description: "Product detail card & gallery arrangements" },
  { id: "profile", label: "Profile Appearance", icon: UserCircle, description: "Customer account & profile surfaces" },
  { id: "auth", label: "Auth Page Appearance", icon: KeyRound, description: "Login, registration & portal styles" },
];

const AdminAppearance: React.FC = () => {
  useSeoMeta("Appearance", "Typography & layout for every surface");
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const rawTab = searchParams.get("tab");
  const tab: TabKey =
    rawTab === "marquee" || rawTab === "product" || rawTab === "profile" || rawTab === "auth"
      ? (rawTab as TabKey)
      : "storefront";

  const setTab = (newTab: TabKey) => {
    navigate(`${location.pathname}?tab=${newTab}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Subnav Tabs Bar ── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card border border-border/50 overflow-x-auto">
        {APPEARANCE_TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "storefront" && <AdminStorefrontAppearance />}
      {tab === "marquee" && <MarqueeStripConfigPanel />}
      {tab === "product" && <ProductDetailLayoutPanel />}
      {tab === "profile" && <AdminProfileAppearance />}
      {tab === "auth" && <AdminAuthAppearance />}
    </div>
  );
};

export default AdminAppearance;
// code:4ce0
