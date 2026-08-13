"use client";
import React, { createContext, useContext, useMemo } from "react";
import { Navigate, useLocation } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SectionLoader from "@/components/loaders/SectionLoader";
import { useStaffSections } from "@/hooks/use-staff-sections";

type AdminRole = "admin" | "moderator" | null;

const AdminRoleContext = createContext<AdminRole>(null);
export const useAdminRole = () => useContext(AdminRoleContext);

/**
 * Maps `/origin/...` and `/affiliate-hub` paths to the staff_sections key
 * the user must have access to. Keep in sync with admin-nav.ts.
 * Paths not listed here are admin-only.
 */
const PATH_TO_SECTION: Array<[RegExp, string]> = [
  // catalog
  [/^\/origin\/products(\/|$|\?)/, "products"],
  [/^\/origin\/categories(\/|$|\?)/, "products"],
  [/^\/origin\/reviews(\/|$|\?)/, "products"],
  [/^\/origin\/requests(\/|$|\?)/, "products"],
  [/^\/origin\/showcase(\/|$|\?)/, "products"],
  // sales / fulfillment
  [/^\/origin\/orders(\/|$|\?)/, "orders"],
  [/^\/origin\/returns(\/|$|\?)/, "orders"],
  [/^\/origin\/coupons(\/|$|\?)/, "orders"],
  [/^\/origin\/delivery-offers(\/|$|\?)/, "orders"],
  [/^\/origin\/couriers(\/|$|\?)/, "orders"],
  [/^\/origin\/courier-management(\/|$|\?)/, "orders"],
  [/^\/origin\/shipping(\/|$|\?)/, "orders"],
  [/^\/origin\/pathao(\/|$|\?)/, "orders"],
  [/^\/origin\/payment-gateways(\/|$|\?)/, "orders"],
  [/^\/origin\/user-promos(\/|$|\?)/, "orders"],
  // customers / marketing
  [/^\/origin\/customers(\/|$|\?)/, "customers"],
  [/^\/origin\/support(\/|$|\?)/, "customers"],
  [/^\/origin\/announcements(\/|$|\?)/, "customers"],
  [/^\/origin\/email-/, "customers"],
  [/^\/affiliate-hub(\/|$|\?)/, "affiliate"],
  // analytics
  [/^\/origin\/customer-analytics(\/|$|\?)/, "analytics"],
  [/^\/origin\/live-activity(\/|$|\?)/, "analytics"],
  // storefront / portfolio
  [/^\/origin\/landing(\/|$|\?)/, "portfolio"],
  [/^\/origin\/home(\/|$|\?)/, "portfolio"],
  [/^\/origin\/cms-pages(\/|$|\?)/, "portfolio"],
  [/^\/origin\/banners(\/|$|\?)/, "storefront_ui"],
  [/^\/origin\/footer(\/|$|\?)/, "storefront_ui"],
  [/^\/origin\/mobile-ui(\/|$|\?)/, "storefront_ui"],
  [/^\/origin\/branding(\/|$|\?)/, "storefront_ui"],
  [/^\/origin\/appearance(\/|$|\?)/, "storefront_ui"],
  // growth
  [/^\/origin\/seo(\/|$|\?)/, "seo"],
  [/^\/origin\/tracking(\/|$|\?)/, "seo"],
  [/^\/origin\/ai-settings(\/|$|\?)/, "ai"],
  [/^\/origin\/recommendations(\/|$|\?)/, "ai"],
  [/^\/origin\/call-settings(\/|$|\?)/, "settings"],
  [/^\/origin\/telegram(\/|$|\?)/, "settings"],
  // corporate
  [/^\/origin\/corporate(\/|$|\?)/, "employees"],
  // system
  [/^\/origin\/settings(\/|$|\?)/, "settings"],
  [/^\/origin\/db-health(\/|$|\?)/, "settings"],
  [/^\/origin\/debug(\/|$|\?)/, "settings"],
];

function sectionForPath(path: string): string | null {
  const cleaned = path.replace(/\/$/, "") || "/origin";
  // Treat /origin root as always-visible to any staff member.
  if (cleaned === "/origin") return null;
  for (const [re, key] of PATH_TO_SECTION) {
    if (re.test(cleaned + "/")) return key;
  }
  return null;
}

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["user-admin-role", user?.id],
    queryFn: async (): Promise<AdminRole> => {
      if (!user?.id) return null;
      try {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (isAdmin) return "admin";

        const { data: isMod } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "moderator",
        });
        if (isMod) return "moderator";

        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (userRoles && userRoles.length > 0) {
          const roles = userRoles.map((r: any) => r.role);
          if (roles.includes("admin") || roles.includes("master_admin")) return "admin";
          if (roles.includes("moderator")) return "moderator";
        }

        return null;
      } catch (err) {
        console.error("[AdminRoute] Storefront role check exception:", err);
        return null;
      }
    },
    enabled: !!user && !!user.id,
    staleTime: 60 * 1000,
    retry: 2,
  });

  const { data: staff, isLoading: staffLoading } = useStaffSections();

  const allowed = useMemo(() => {
    if (!role) return false;
    if (role === "admin") return true;
    const section = sectionForPath(location.pathname);
    if (!section) return true; // /origin root and unknown paths are visible
    return staff?.hasAccess(section) ?? false;
  }, [role, location.pathname, staff]);

  // Inline styles (not Tailwind classes): this is the first thing painted
  // on a hard reload, before app.css necessarily finishes loading.
  if (loading || roleLoading || (role && role !== "admin" && staffLoading)) {
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

  if (!user) return <Navigate to="/auth" replace />;
  if (!role) return <Navigate to="/" replace />;
  if (!allowed) return <Navigate to="/origin" replace />;

  return (
    <AdminRoleContext.Provider value={role}>
      {children}
    </AdminRoleContext.Provider>
  );
};

export default AdminRoute;
// code:4ce0
