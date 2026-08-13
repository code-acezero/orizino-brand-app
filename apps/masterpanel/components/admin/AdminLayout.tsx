"use client";
import React, { useState, useMemo } from "react";
import { useLocation } from "@/lib/router-compat";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminCommandPalette } from "./AdminCommandPalette";
import AdminMobileShell from "./AdminMobileShell";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useAdminHotkeys } from "@/hooks/use-admin-hotkeys";
import AdminFooter from "./AdminFooter";
import { ChevronRight } from "lucide-react";
import { allAdminItems } from "./admin-nav";
import AutoSkeleton from "@/components/skeletons/AutoSkeleton";
import AdminTopBar from "./AdminTopBar";
import { cn } from "@/lib/utils";
import { RelatedSettingsNav } from "./RelatedSettingsNav";


const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const bp = useBreakpoint();
  const isTablet = bp === "tablet";
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  useAdminHotkeys(() => setHelpOpen(true));

  // Resolve the canonical path (strip trailing slash)
  const normalisedPath = useMemo(() => {
    const p = location.pathname.replace(/\/$/, "") || "/";
    return p;
  }, [location.pathname]);

  // Derive section name from the first path segment
  const sectionMeta = useMemo((): { name: string; sub: string; subShort: string } => {
    const seg = normalisedPath.split("/")[1] ?? "";
    const map: Record<string, { full: string; short: string }> = {
      "":            { full: "Master Panel",           short: "Master" },
      "sales":       { full: "Sales & Operations",     short: "Sales" },
      "marketing":     { full: "Marketing Management",   short: "Marketing" },
      "email":       { full: "Email Marketing",        short: "Email" },
      "affiliate":   { full: "Affiliate Program",      short: "Affiliate" },
      "brand":       { full: "Brand & Storefront",     short: "Branding" },
      "system":      { full: "Backend & System",       short: "System" },
      "settings-ai": { full: "Settings & AI",          short: "Settings" },
      "team":        { full: "Team & Access",          short: "Team" },
      "master":      { full: "All Sections",           short: "All" },
    };
    const entry = map[seg] ?? { full: "Admin", short: "Admin" };
    return { name: "Control Panel", sub: entry.full, subShort: entry.short };
  }, [normalisedPath]);

  const pageMeta = useMemo(() => {
    const match = [...allAdminItems]
      .sort((a, b) => b.url.split("?")[0].length - a.url.split("?")[0].length)
      .find((i) => {
        const path = i.url.split("?")[0].replace(/\/+$/, "") || "/";
        return path === "/" ? normalisedPath === "/" : normalisedPath === path || normalisedPath.startsWith(path + "/");
      });
    return match ?? { title: "", description: "" };
  }, [normalisedPath]);

  const isRoot = normalisedPath === "/";

  // Mobile and tablet use the mobile shell to avoid sidebar layout breakage.
  if (isMobile || isTablet) {
    return <AdminMobileShell>{children}</AdminMobileShell>;
  }

  return (
    <SidebarProvider defaultOpen={!isTablet}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/40">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopBar
            showCommand
            onOpenPalette={() => setPaletteOpen(true)}
            showShortcuts
            onOpenShortcuts={() => setHelpOpen(true)}
            leading={
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
                <span className="hidden lg:inline text-muted-foreground shrink-0">{sectionMeta.name}</span>
                <ChevronRight className="hidden lg:inline w-3.5 h-3.5 text-muted-foreground/60 shrink-0" aria-hidden />
                <span className={cn("shrink-0", isRoot || !pageMeta.title ? "font-medium text-foreground" : "text-muted-foreground")}>
                  <span className="hidden md:inline">{sectionMeta.sub}</span>
                  <span className="md:hidden">{sectionMeta.subShort}</span>
                </span>
                {!isRoot && pageMeta.title && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" aria-hidden />
                    <span className="font-medium text-foreground truncate">{pageMeta.title}</span>
                  </>
                )}
              </nav>
            }
          />

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <div className="max-w-[1600px] mx-auto">
              <React.Suspense fallback={<AutoSkeleton />}>
                {children}
              </React.Suspense>
              <RelatedSettingsNav />
            </div>
          </main>
          <AdminFooter onOpenShortcuts={() => setHelpOpen(true)} />
        </div>


        <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
// code:4ce0
