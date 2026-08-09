"use client";
import React, { useState } from "react";
import { useAdminRole } from "@/components/AdminRoute";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/lib/router-compat";
import AdminFooter from "./AdminFooter";
import { AdminCommandPalette } from "./AdminCommandPalette";
import { LayoutGrid, Grid3x3 } from "lucide-react";
import AutoSkeleton from "@/components/skeletons/AutoSkeleton";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { NavLink } from "@/components/NavLink";
import { useStaffSections } from "@/hooks/use-staff-sections";
import AdminTopBar from "./AdminTopBar";
import AdminMobileShell from "./AdminMobileShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

/**
 * Master Panel layout — clean, sidebar-free shell.
 * Used only at "/" (the section navigator / home page).
 */
const MasterPanelLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const role = useAdminRole();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data: staffData } = useStaffSections();
  const isFounder = role === "admin" || !!staffData?.isAdmin;
  const isMobile = useIsMobile();
  const bp = useBreakpoint();
  const isTablet = bp === "tablet";
  const currentPanel: "master" | "control" =
    location.pathname === "/master" || location.pathname.startsWith("/master/") ? "control" : "master";

  // Site settings kept for future use (favicon/logo elsewhere); brand block
  // removed from the top bar to avoid duplicating the sidebar header.
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-admin-sidebar"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "logo_url", "site_icon_url"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val: any = s.value;
        map[s.key] = typeof val === "object" && val !== null ? val.value ?? val : val;
      });
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });
  void siteSettings;

  const panelSwitcher = isFounder ? (
    <div
      role="tablist"
      aria-label="Panel switcher"
      className="flex items-center gap-0.5 sm:gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/50 shrink-0 whitespace-nowrap"
    >
      <NavLink
        to="/"
        end
        className={cn(
          "inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-7 px-2 sm:px-2.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap",
          currentPanel === "master"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="w-3 h-3 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Master Panel</span>
        <span className="sm:hidden">Panel</span>
      </NavLink>
      <NavLink
        to="/master"
        className={cn(
          "inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-7 px-2 sm:px-2.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap",
          currentPanel === "control"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Grid3x3 className="w-3 h-3 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Master Control</span>
        <span className="sm:hidden">Control</span>
      </NavLink>
    </div>
  ) : null;

  // Mobile + tablet: use the iOS-style AdminMobileShell (with bottom tab bar),
  // matching the Control Panel experience.
  if (isMobile || isTablet) {
    return <AdminMobileShell>{children}</AdminMobileShell>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/40">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopBar
            showCommand
            onOpenPalette={() => setPaletteOpen(true)}
            center={panelSwitcher}
            showPresence={false}
          />

          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
            <div className="max-w-[1400px] mx-auto">
              <React.Suspense fallback={<AutoSkeleton />}>
                {children}
              </React.Suspense>
            </div>
          </main>

          <AdminFooter onOpenShortcuts={() => {}} />
        </div>
      </div>
      <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </SidebarProvider>
  );
};

export default MasterPanelLayout;
// code:4ce0
