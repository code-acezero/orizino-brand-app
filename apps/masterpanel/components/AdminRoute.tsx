"use client";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { Navigate, useLocation } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SectionLoader from "@/components/loaders/SectionLoader";
import { useStaffSections } from "@/hooks/use-staff-sections";
import { AlertTriangle, RefreshCw } from "lucide-react";

// Master panel session cap: force re-login after 12h regardless of Supabase JWT.
const MP_SESSION_MAX_MS = 12 * 60 * 60 * 1000;
const MP_SESSION_KEY = "mp_session_start";

function useMasterPanelSessionTimeout(userId: string | undefined) {
  useEffect(() => {
    if (!userId) {
      localStorage.removeItem(MP_SESSION_KEY);
      return;
    }
    const stored = localStorage.getItem(MP_SESSION_KEY);
    if (!stored || Number.isNaN(parseInt(stored, 10))) {
      localStorage.setItem(MP_SESSION_KEY, String(Date.now()));
    }
    const check = async () => {
      const s = parseInt(localStorage.getItem(MP_SESSION_KEY) || "0", 10);
      if (s && Date.now() - s > MP_SESSION_MAX_MS) {
        localStorage.removeItem(MP_SESSION_KEY);
        await supabase.auth.signOut();
        window.location.href = "/auth";
      }
    };
    void check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [userId]);
}

type AdminRole = "admin" | "moderator" | null;

const AdminRoleContext = createContext<AdminRole>(null);
export const useAdminRole = () => useContext(AdminRoleContext);

/**
 * Maps new section-based paths to the staff_sections key.
 * Keep in sync with admin-nav.ts section URL structure.
 * Paths not listed here are accessible to all authenticated staff.
 */
const PATH_TO_SECTION: Array<[RegExp, string]> = [
  // /sales section — products
  [/^\/sales\/(products|categories|reviews|requests|showcase)/, "products"],
  // /sales section — orders & fulfillment
  [/^\/sales\/(orders|returns|coupons|delivery-offers|couriers|courier-management|shipping|pathao|payment-gateways|user-promos)/, "orders"],
  // /sales section — customers & support
  [/^\/sales\/(customers|support|announcements)/, "customers"],
  // /sales section — analytics
  [/^\/sales\/(customer-analytics|live-activity)/, "analytics"],
  // /sales section — employees
  [/^\/sales\/employees/, "employees"],

  // /marketing section
  [/^\/marketing/, "seo"],

  // /email section
  [/^\/email/, "seo"],

  // /affiliate section
  [/^\/affiliate/, "affiliate"],

  // /brand section
  [/^\/brand/, "storefront_ui"],

  // /system section — admin only
  [/^\/system/, "settings"],

  // /settings-ai section
  [/^\/settings-ai/, "settings"],

  // /team section
  [/^\/team/, "employees"],

  // Legacy paths (still work via rewrite passthrough)
  [/^\/affiliate-hub/, "affiliate"],
];

function sectionForPath(path: string): string | null {
  const cleaned = path.replace(/\/$/, "") || "/";
  if (cleaned === "/") return null;
  for (const [re, key] of PATH_TO_SECTION) {
    if (re.test(cleaned)) return key;
  }
  return null;
}

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  useMasterPanelSessionTimeout(user?.id);


  const { data: role, isLoading: roleLoading, isError: roleError, error: roleErrorObj, refetch: refetchRole } = useQuery({
    queryKey: ["user-admin-role", user?.id],
    queryFn: async (): Promise<AdminRole> => {
      const { data: isAdmin, error: adminErr } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (adminErr) {
        console.error("[AdminRoute] has_role(admin) failed:", adminErr);
        throw adminErr;
      }
      if (isAdmin) return "admin";
      const { data: isMod, error: modErr } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "moderator",
      });
      if (modErr) {
        console.error("[AdminRoute] has_role(moderator) failed:", modErr);
        throw modErr;
      }
      if (isMod) return "moderator";
      return null;
    },
    enabled: !!user,
    retry: 2,
  });

  const { data: staff, isLoading: staffLoading } = useStaffSections();

  const allowed = useMemo(() => {
    if (!role) return false;
    if (role === "admin") return true;
    const section = sectionForPath(location.pathname);
    if (!section) return true; // dashboard, section roots without sub-path
    return staff?.hasAccess(section) ?? false;
  }, [role, location.pathname, staff]);

  // Inline styles (not Tailwind classes) here on purpose: this is the very
  // first thing painted on a hard reload, before app.css necessarily
  // finishes loading. Centering via a Tailwind class renders at the default
  // top-left flow position for a frame, then jumps to center once the
  // stylesheet applies — inline styles apply immediately, no jump.
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

  // Not signed in — guard client-side after auth context has finished restoring.
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;

  // has_role RPC failed — don't bounce to /auth while still signed in; that
  // creates an auth-page flash loop because /auth immediately sends users home.
  if (roleError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Could not verify admin access</h1>
            <p className="text-sm text-muted-foreground">
              Your session is active, but the access check failed. Try again, or sign out and back in.
            </p>
            {roleErrorObj && (
              <pre className="text-[11px] text-left bg-muted/50 border border-border rounded-md p-3 overflow-auto max-h-40 text-muted-foreground">
                {(roleErrorObj as any)?.message ?? String(roleErrorObj)}
                {(roleErrorObj as any)?.code ? `\ncode: ${(roleErrorObj as any).code}` : ""}
                {(roleErrorObj as any)?.details ? `\ndetails: ${(roleErrorObj as any).details}` : ""}
                {(roleErrorObj as any)?.hint ? `\nhint: ${(roleErrorObj as any).hint}` : ""}
              </pre>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void refetchRole()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Retry
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated but no role assigned — show unauthorized page
  if (role === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your account doesn't have admin or moderator access. Contact the site owner to get access.
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Sign out
        </button>
      </div>
    );
  }

  // Role exists but current path not allowed for this staff member
  if (!allowed) return <Navigate to="/" replace />;

  // Single-section staff: skip dashboard, go directly to their section
  const singleSectionRedirect = (() => {
    if (!staff || role === "admin" || location.pathname !== "/") return null;
    const accessible = staff.accessible ?? [];
    if (accessible.length !== 1) return null;
    const sectionKey = accessible[0].key as string;
    const SECTION_URLS: Record<string, string> = {
      products:       "/sales/products",
      orders:         "/sales/orders",
      offline_orders: "/sales/offline-orders",
      customers:      "/sales/customers",
      affiliate:      "/affiliate",
      seo:            "/marketing",
      storefront_ui:  "/brand",
      portfolio:      "/brand/landing",
      ai:             "/settings-ai/ai-settings",
      analytics:      "/sales/customer-analytics",
      employees:      "/team/employees",
      settings:       "/settings-ai",
    };
    return SECTION_URLS[sectionKey] ?? null;
  })();

  if (singleSectionRedirect) return <Navigate to={singleSectionRedirect} replace />;

  return (
    <AdminRoleContext.Provider value={role ?? null}>
      {children}
    </AdminRoleContext.Provider>
  );
};

export default AdminRoute;
// code:4ce0
