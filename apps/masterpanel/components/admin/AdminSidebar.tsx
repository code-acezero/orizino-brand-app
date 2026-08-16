"use client";
import { useState, useEffect, useMemo } from "react";
import { Search, ArrowLeft, ChevronDown, ChevronUp, Star, StarOff, LayoutGrid, UserCircle2, MapPin, IdCard, KeyRound, Users2, Inbox, History, Smartphone, ShoppingCart, Tag, Palette, Activity, Settings, Home, Send, Package } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { storefrontHref, shopHref, getBackToShopLabel, getBackToShopLabelShort, orderOpsHref } from "@/lib/cross-app-urls";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/components/AdminRoute";
import { useStaffSections } from "@/hooks/use-staff-sections";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminNav, type AdminNavItem } from "./admin-nav";
import { cn } from "@/lib/utils";

import { BrandImage } from "@/lib/brand-image";
import {
  SECTION_LABELS,
  SEGMENT_TO_NAV_LABELS,
  SECTION_LANDING_PATHS,
} from "@/lib/master-sections";

const MASTER_CONTROL_ITEMS = [
  { title: "Customer & Sales", url: "/sales", icon: ShoppingCart, color: "#f59e0b", section: "orders" },
  { title: "Products, Shipping & Offers", url: "/sales/products-management?tab=products", icon: Package, color: "#10b981", section: "products" },
  { title: "Marketing Management", url: "/marketing", icon: Search, color: "#f97316", section: "seo" },
  { title: "Email Marketing", url: "/email", icon: Send, color: "#06b6d4", section: "customers" },
  { title: "Affiliate Program", url: "/affiliate", icon: Tag, color: "#84cc16", section: "affiliate" },
  { title: "Public Contents & UI", url: "/brand", icon: Palette, color: "#ec4899", section: "storefront_ui" },
  { title: "Backend & System", url: "/system", icon: Activity, color: "#38bdf8", section: "settings" },
  { title: "Settings & AI", url: "/settings-ai", icon: Settings, color: "#94a3b8", section: "settings" },
  { title: "Team & Access", url: "/team", icon: Users2, color: "#a855f7", section: "employees" },
];

const splitNavUrl = (url: string) => {
  const [path, query = ""] = url.split("?");
  return { path: path.replace(/\/+$/, "") || "/", query };
};

const PINNED_KEY = "admin:pinned-nav";

function usePinned() {
  const [pinned, setPinned] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(PINNED_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const toggle = (url: string) => {
    setPinned((prev) => {
      const next = prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url];
      try {
        localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  return { pinned, toggle };
}

export function AdminSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const role = useAdminRole();
  const { data: staff } = useStaffSections();
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { pinned, toggle: togglePin } = usePinned();

  const isMasterPanelHome = location.pathname === "/" || location.pathname === "/master";
  const headerTitle = isMasterPanelHome ? "Master Panel" : "Control Panel";
  const isSettingsSubroute = (() => {
    const clean = location.pathname.replace(/\/+$/, "");
    return clean === "/settings-ai" || clean.startsWith("/settings-ai") ||
           clean === "/settings" || clean.startsWith("/settings") ||
           clean.startsWith("/sales/payment-gateways");
  })();

  const isProductShippingOffersRoute = (() => {
    const clean = location.pathname.replace(/\/+$/, "");
    const search = location.search;
    return (
      clean.startsWith("/sales/products") ||
      clean.startsWith("/sales/categories") ||
      clean.startsWith("/sales/stock") ||
      clean.startsWith("/sales/invoice-stickers") ||
      clean.startsWith("/sales/coupons") ||
      clean.startsWith("/sales/reviews") ||
      clean.startsWith("/sales/requests") ||
      clean.startsWith("/sales/user-promos") ||
      clean.startsWith("/sales/showcase") ||
      clean.startsWith("/sales/shipping") ||
      clean.startsWith("/sales/couriers") ||
      clean.startsWith("/sales/courier-management") ||
      clean.startsWith("/sales/delivery-offers") ||
      clean.startsWith("/sales/payments-couriers") ||
      clean.startsWith("/products") ||
      (clean === "/sales/products-management" && !search.includes("tab=scanner"))
    );
  })();

  const sectionLabel = (() => {
    if (isSettingsSubroute) return "Settings & AI";
    if (isProductShippingOffersRoute) return "Products, Shipping & Offers";
    const seg = location.pathname.replace(/\/+$/, "").split("/")[1] ?? "";
    if (seg === "sales") return "Customer & Sales";
    return SECTION_LABELS[seg] ?? "Admin Management";
  })();

  // Only show nav sections relevant to the current route segment (unless actively searching)
  const visibleNavLabels = (() => {
    if (query.trim()) return null;
    if (isSettingsSubroute) return ["Settings & AI"];
    if (isProductShippingOffersRoute) return ["Products, Shipping & Offers"];
    const seg = location.pathname.replace(/\/+$/, "").split("/")[1] ?? "";
    if (seg === "sales") return ["Customer & Sales"];
    return SEGMENT_TO_NAV_LABELS[seg] ?? ["Overview"];
  })();


  // Master Control is only shown when user has access to 2+ sections (or is admin)
  const canSeeMasterControl = !!staff?.isAdmin || role === "admin" ||
    (staff?.accessible?.length ?? 0) >= 2;

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-admin-sidebar"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "logo_url", "site_icon_url", "logo_display_style", "logo_color_filter", "logo_tint_color"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val: any = s.value;
        map[s.key] = typeof val === "object" && val !== null ? val.value ?? val : val;
      });
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });
  const siteName = (siteSettings?.site_name as string) || "";
  const logoUrl = (siteSettings?.logo_url as string) || "/orizino-logo.svg";
  const siteIconUrl = (siteSettings?.site_icon_url as string) || "/orizino-logo.svg";
  const logoFilter = (siteSettings?.logo_color_filter as any) || "none";
  const logoTint = (siteSettings?.logo_tint_color as string) || "#ffffff";
  const logoStyle = (siteSettings?.logo_display_style as string) || "rounded";
  const logoShapeClass =
    logoStyle === "square"
      ? "rounded-lg"
      : logoStyle === "circle" || logoStyle === "pill"
      ? "rounded-full"
      : "rounded-lg";

  const { data: openSupportCount = 0, refetch: refetchSupport } = useQuery({
    queryKey: ["admin-open-support-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("support_conversations")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-support-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_conversations" },
        () => refetchSupport()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetchSupport]);

  const currentPath = location.pathname;
  const normalizedCurrentPath = currentPath.replace(/\/+$/, "") || "/";
  const pathMatches = (path: string, exact = false) => {
    const cleanPath = path.replace(/\/+$/, "") || "/";
    if (cleanPath === "/") return normalizedCurrentPath === "/";
    return exact
      ? normalizedCurrentPath === cleanPath
      : normalizedCurrentPath === cleanPath || normalizedCurrentPath.startsWith(cleanPath + "/");
  };

  const searchMatches = (query: string) => {
    if (!query) return location.search === "" || location.search === "?";
    const target = new URLSearchParams(query);
    const current = new URLSearchParams(location.search);
    for (const [key, value] of target.entries()) {
      if (current.get(key) !== value) return false;
    }
    return true;
  };

  const isActive = (path: string) => {
    const { path: cleanPath, query } = splitNavUrl(path);
    if (query) return pathMatches(cleanPath, true) && searchMatches(query);
    if (SECTION_LANDING_PATHS.has(cleanPath)) return pathMatches(cleanPath, true);
    return pathMatches(cleanPath);
  };

  const isChildActive = (childUrl: string, siblings?: Array<{ url: string }>) => {
    const { path: base, query } = splitNavUrl(childUrl);
    if (!pathMatches(base, !!query)) return false;
    if (query) return searchMatches(query);

    // If this child URL has no query string, check if any sibling matches a specific query in current URL
    if (siblings?.length) {
      const anySiblingMatches = siblings.some((sib) => {
        if (sib.url === childUrl) return false;
        const { path: sPath, query: sQuery } = splitNavUrl(sib.url);
        return pathMatches(sPath, true) && sQuery && searchMatches(sQuery);
      });
      if (anySiblingMatches) return false;
    }
    return true;
  };

  // When on a group's base path with no `?tab=` in the URL, the page's
  // default tab is shown — treat the first child as active so the sidebar
  // reflects the visible sub-section.
  const isDefaultChild = (childUrl: string, idx: number) => {
    if (idx !== 0) return false;
    const { path: base, query } = splitNavUrl(childUrl);
    if (!pathMatches(base, true)) return false;
    const target = Array.from(new URLSearchParams(query).entries());
    if (target.length === 0) return false;
    const current = new URLSearchParams(location.search);
    const defaultKey = target[target.length - 1][0];
    if (current.has(defaultKey)) return false;
    return target.slice(0, -1).every(([key, value]) => current.get(key) === value);
  };

  const getBadge = (url: string) =>
    url === "/sales/support" && openSupportCount > 0 ? openSupportCount : null;

  // A parent group counts as "containing the active route" if the parent
  // url matches OR any of its (grand)children match the current path/search.
  const hasActiveDescendant = (item: AdminNavItem): boolean => {
    if (!item.children?.length) return false;
    return item.children.some(
      (c, idx) =>
        isChildActive(c.url, item.children) ||
        isDefaultChild(c.url, idx) ||
        hasActiveDescendant(c as AdminNavItem),
    );
  };

  // Auto-open the group containing the active route (parent or any descendant).
  // Auto-open the group containing the active route (parent or any descendant).
  useEffect(() => {
    const next: Record<string, boolean> = {};
    const walk = (item: AdminNavItem) => {
      if (!item.children?.length) return;
      if (isActive(item.url) || hasActiveDescendant(item)) {
        next[item.url] = true;
      }
      item.children.forEach((c) => walk(c as AdminNavItem));
    };
    adminNav.forEach((section) => section.items.forEach(walk));
    setOpenGroups((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, location.search]);

  const filterItems = (items: AdminNavItem[]) => {
    // Admins always see everything; staff (non-admin) are gated by
    // staff_section_access via useStaffSections().hasAccess(section).
    // Legacy moderators (no section grants) fall back to !adminOnly.
    const isAdmin = !!staff?.isAdmin || role === "admin";
    const hasAnyGrant = (staff?.accessible?.length ?? 0) > 0;
    const sectionFiltered = items.filter((i) => {
      if (isAdmin) return true;
      if (i.url === "/" || i.url === "/master") return true;
      if (i.section) return staff?.hasAccess(i.section) ?? false;
      // No section assigned — fall back to legacy rule
      return hasAnyGrant ? false : !i.adminOnly;
    });
    if (!query.trim()) return sectionFiltered;
    const q = query.toLowerCase();
    return sectionFiltered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.keywords ?? "").toLowerCase().includes(q) ||
        i.children?.some((c) => c.title.toLowerCase().includes(q))
    );
  };

  const pinnedItems = useMemo(() => {
    const all = adminNav.flatMap((s) => s.items);
    return pinned
      .map((url) => all.find((i) => i.url === url))
      .filter(Boolean) as AdminNavItem[];
  }, [pinned]);

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const renderItem = (item: AdminNavItem, showPin = true) => {
    const badge = getBadge(item.url);
    const hasChildren = !!item.children?.length;
    const descendantActive = hasChildren && hasActiveDescendant(item);
    const ownActive = isActive(item.url);
    const isParentActive = ownActive || descendantActive;
    const defaultOpen = ownActive || descendantActive;
    const open = openGroups[item.url] ?? defaultOpen;
    const isPinned = pinned.includes(item.url);

    return (
      <SidebarMenuItem key={item.url + item.title}>
        <div className="group/item relative flex items-center">
          <SidebarMenuButton
            asChild={!hasChildren}
            size="sm"
            tooltip={collapsed ? item.title : undefined}
            onClick={hasChildren ? (e) => {
              e.preventDefault();
              setOpenGroups((p) => ({ ...p, [item.url]: !(p[item.url] ?? defaultOpen) }));
            } : undefined}
            className={
              (isParentActive
                ? "h-9 text-[13px] bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-semibold rounded-lg"
                : "h-9 text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg") +
              (!collapsed && showPin ? (hasChildren ? " pr-12" : " pr-7") : "")
            }
          >
            {hasChildren ? (
              <span className="w-full flex items-center gap-2 cursor-pointer">
                <item.icon className="shrink-0 !size-[15px]" />
                <span className="truncate flex-1 text-left">{item.title}</span>
                {!collapsed && (
                  <ChevronDown
                    className={`!size-3.5 shrink-0 transition-transform duration-200 ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                )}
              </span>
            ) : (
              <NavLink to={item.url} end={item.url === "/"} onClick={closeOnMobile}>
                <item.icon className="shrink-0 !size-[15px]" />
                <span className="truncate">{item.title}</span>
                {badge != null && !collapsed && (
                  <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                    {badge}
                  </span>
                )}
                {badge != null && collapsed && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive" />
                )}
              </NavLink>
            )}
          </SidebarMenuButton>
          {!collapsed && showPin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePin(item.url);
              }}
              className={`absolute ${hasChildren ? "right-7" : "right-1"} top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-muted ${
                isPinned ? "!opacity-100 text-primary" : "text-muted-foreground"
              }`}
              title={isPinned ? "Unpin" : "Pin to favorites"}
            >
              {isPinned ? <Star className="w-3 h-3 fill-current" /> : <StarOff className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && open && !collapsed && (
          <div className="ml-4 mt-0.5 pl-3 border-l border-border/40 space-y-0.5">
            {item.children!.map((child, idx) => {
              const hasSub = !!child.children?.length;
              const subActive = hasSub && child.children!.some(
                (sub, sIdx) => isChildActive(sub.url, child.children) || isDefaultChild(sub.url, sIdx),
              );
              const childOwnActive = isChildActive(child.url, item.children) || isDefaultChild(child.url, idx);
              const cActive = childOwnActive || subActive;
              const subOpen = openGroups[child.url] ?? (childOwnActive || subActive);

              return (
                <div key={child.url}>
                  <div className="flex items-center">
                    {hasSub ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenGroups((p) => ({ ...p, [child.url]: !(p[child.url] ?? subOpen) }));
                        }}
                        className={`flex-1 flex items-center justify-between h-7 px-2 rounded-md text-[12px] transition-colors ${
                          cActive
                            ? "text-primary bg-primary/10 font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="truncate">{child.title}</span>
                        <ChevronDown
                          className={`!size-3 transition-transform duration-200 ${subOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    ) : (
                      <NavLink
                        to={child.url}
                        onClick={closeOnMobile}
                        className={`flex-1 flex items-center h-7 px-2 rounded-md text-[12px] transition-colors ${
                          cActive
                            ? "text-primary bg-primary/10 font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="truncate">{child.title}</span>
                      </NavLink>
                    )}
                  </div>
                  {hasSub && subOpen && (
                    <div className="ml-3 mt-0.5 pl-3 border-l border-border/30 space-y-0.5">
                      {child.children!.map((sub, sIdx) => {
                        const sActive = isChildActive(sub.url, child.children) || isDefaultChild(sub.url, sIdx);

                        return (
                          <NavLink
                            key={sub.url}
                            to={sub.url}
                            onClick={closeOnMobile}
                            className={`flex items-center h-6 px-2 rounded-md text-[11.5px] transition-colors ${
                              sActive
                                ? "text-primary bg-primary/10 font-semibold"
                                : "text-muted-foreground/90 hover:text-foreground hover:bg-muted/40"
                            }`}
                          >
                            <span className="truncate">{sub.title}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="border-b border-border/40 group-data-[collapsible=icon]:p-2 p-3">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          {logoUrl ? (
            <BrandImage
              src={logoUrl}
              alt={siteName}
              filter={logoFilter}
              customColor={logoTint}
              className="w-6 h-6 rounded object-contain shrink-0"
            />
          ) : siteIconUrl ? (
            <BrandImage
              src={siteIconUrl}
              alt={siteName}
              filter={logoFilter}
              customColor={logoTint}
              className="w-6 h-6 rounded object-contain shrink-0"
            />
          ) : (
            <div
              className="w-6 h-6 rounded bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shrink-0"
            >
              <span className="text-primary-foreground font-bold text-[10px]">
                {(siteName || "A").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-foreground leading-tight tracking-tight">
                {headerTitle}
              </h2>
              <p className="text-[10px] text-muted-foreground leading-tight uppercase tracking-wider">
                {sectionLabel}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              id="admin-sidebar-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search… (press /)"
              className="w-full h-8 pl-8 pr-2 text-xs rounded-lg bg-muted/40 border border-border/40 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 gap-0">
        {(() => {
          // Scoped sidebar when on the personal profile page:
          // show only Profile (with in-page tab sub-items) and Team (if the
          // current user has team access). This hides the giant "all
          // sections" nav that leaks in via the /master segment.
          const onProfile = normalizedCurrentPath === "/master/profile" || normalizedCurrentPath.startsWith("/master/profile/");
          if (!onProfile) return null;
          const currentTab = new URLSearchParams(location.search).get("tab") ?? "overview";
          const isStaff = !!staff?.isAdmin || role === "admin" || role === "moderator" || (staff?.accessible?.length ?? 0) > 0;
          const canTeam = !!staff?.isAdmin || role === "admin" || (staff?.hasAccess?.("employees") ?? false);
          const tabItems: Array<{ key: string; label: string; icon: React.ComponentType<any> }> = [
            { key: "overview", label: "Overview", icon: UserCircle2 },
            { key: "personal", label: "Personal", icon: MapPin },
            ...(isStaff ? [{ key: "identity", label: "Public identity", icon: IdCard }] : []),
            { key: "security", label: "Security", icon: KeyRound },
          ];
          return (
            <>
              <SidebarGroup className="px-0 py-1">
                {!collapsed && (
                  <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold px-3 h-6">
                    Account
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        size="sm"
                        tooltip={collapsed ? "Profile" : undefined}
                        className="h-9 text-[13px] bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-medium rounded-lg"
                      >
                        <span className="w-full flex items-center gap-2">
                          <UserCircle2 className="shrink-0 !size-[15px]" />
                          <span className="truncate flex-1 text-left">Profile</span>
                        </span>
                      </SidebarMenuButton>
                      {!collapsed && (
                        <div className="ml-4 mt-0.5 pl-3 border-l border-border/40 space-y-0.5">
                          {tabItems.map((t) => {
                            const active = currentTab === t.key;
                            return (
                              <NavLink
                                key={t.key}
                                to={`/master/profile?tab=${t.key}`}
                                onClick={closeOnMobile}
                                className={`flex items-center gap-2 h-8 px-2 rounded-md text-[12px] transition-colors ${
                                  active
                                    ? "text-primary bg-primary/10 font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                }`}
                              >
                                <t.icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{t.label}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {canTeam && (
                <SidebarGroup className="px-0 py-1">
                  {!collapsed && (
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold px-3 h-6">
                      Team
                    </SidebarGroupLabel>
                  )}
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild size="sm" tooltip={collapsed ? "My team" : undefined}
                          className="h-9 text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg">
                          <NavLink to="/team/my-team" onClick={closeOnMobile}>
                            <Users2 className="shrink-0 !size-[15px]" />
                            <span className="truncate">My team</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {(!!staff?.isAdmin || role === "admin") && (
                        <>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild size="sm" tooltip={collapsed ? "Employee IDs" : undefined}
                              className="h-9 text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg">
                              <NavLink to="/origin/employee-ids" onClick={closeOnMobile}>
                                <IdCard className="shrink-0 !size-[15px]" />
                                <span className="truncate">Employee IDs</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild size="sm" tooltip={collapsed ? "Approvals" : undefined}
                              className="h-9 text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg">
                              <NavLink to="/origin/profile-approvals" onClick={closeOnMobile}>
                                <Inbox className="shrink-0 !size-[15px]" />
                                <span className="truncate">Approvals</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild size="sm" tooltip={collapsed ? "Identity audit" : undefined}
                              className="h-9 text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg">
                              <NavLink to="/origin/identity-audit" onClick={closeOnMobile}>
                                <History className="shrink-0 !size-[15px]" />
                                <span className="truncate">Identity audit</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </>
          );
        })()}

        {/* Pinned */}
        {pinnedItems.length > 0 && !query && !(normalizedCurrentPath === "/master/profile" || normalizedCurrentPath.startsWith("/master/profile/")) && (
          <SidebarGroup className="px-0 py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold px-3 h-6 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-current" /> Pinned
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {pinnedItems.map((item) => renderItem(item, true))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!(normalizedCurrentPath === "/master/profile" || normalizedCurrentPath.startsWith("/master/profile/")) && adminNav.map((section) => {
          if (visibleNavLabels && !visibleNavLabels.includes(section.label)) return null;
          const filtered = filterItems(section.items);
          if (filtered.length === 0) return null;
          return (
            <SidebarGroup key={section.label} className="px-0 py-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10.5px] uppercase tracking-[0.16em] text-primary/80 font-bold px-3 h-7 mt-2 flex items-center gap-1.5 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                  {section.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {filtered.map((item) => renderItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>


      <SidebarFooter className="p-2 border-t border-border/40">
        <SidebarMenu className="gap-0.5">
          {!isMasterPanelHome && (
            <SidebarMenuItem>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    tooltip={collapsed ? "Master Controls" : undefined}
                    className="h-8 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg group/btn cursor-pointer w-full"
                  >
                    <button type="button" className="flex items-center gap-2 h-8 px-2 text-[13px] text-muted-foreground group-hover/btn:text-foreground rounded-lg transition-colors w-full">
                      <LayoutGrid className="shrink-0 !size-[15px] text-primary" />
                      <span className="truncate flex-1 text-left font-medium">Master Controls</span>
                      <ChevronUp className="shrink-0 !size-3.5 text-muted-foreground/70 transition-transform duration-200 group-data-[state=open]/btn:rotate-180" />
                    </button>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  sideOffset={8}
                  className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-border/80 bg-background/95 backdrop-blur-xl p-1.5 shadow-2xl z-50 space-y-1"
                >
                  <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Master Controls</span>
                    <span className="text-[10px] text-primary font-semibold">Quick Switch</span>
                  </DropdownMenuLabel>

                  <DropdownMenuItem asChild>
                    <NavLink
                      to="/"
                      end
                      onClick={closeOnMobile}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                        isMasterPanelHome
                          ? "bg-primary/15 text-primary border border-primary/30 font-bold"
                          : "text-foreground bg-muted/30 hover:bg-muted/60"
                      )}
                    >
                      <Home className="w-4 h-4 text-primary shrink-0" />
                      <span className="flex-1">Master Panel Home</span>
                      {isMasterPanelHome && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </NavLink>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 bg-border/40" />

                  <div className="space-y-0.5 max-h-[300px] overflow-y-auto pr-0.5">
                    {MASTER_CONTROL_ITEMS.filter((item) => {
                      const isAdmin = !!staff?.isAdmin || role === "admin";
                      if (isAdmin) return true;
                      return staff?.hasAccess(item.section) ?? false;
                    }).map((item) => {
                      const Icon = item.icon;
                      const isSectionActive = !isMasterPanelHome && sectionLabel === item.title;
                      return (
                        <DropdownMenuItem key={item.url} asChild>
                          <NavLink
                            to={item.url}
                            onClick={closeOnMobile}
                            className={cn(
                              "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                              isSectionActive
                                ? "bg-primary/15 text-primary font-bold border border-primary/30"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                            )}
                          >
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: isSectionActive ? `${item.color}35` : `${item.color}18`,
                                border: `1px solid ${isSectionActive ? item.color : item.color + "30"}`
                              }}
                            >
                              <Icon className="w-3 h-3" style={{ color: item.color }} />
                            </div>
                            <span className="truncate flex-1">{item.title}</span>
                            {isSectionActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                          </NavLink>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="sm"
              tooltip={collapsed ? "Order Ops (mobile order app)" : undefined}
              className="h-8 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg"
            >
              <a
                href={orderOpsHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors w-full"
              >
                <Smartphone className="shrink-0 !size-[15px]" />
                <span className="truncate flex-1 text-left font-medium">
                  <span className="lg:hidden">Order Ops</span>
                  <span className="hidden lg:inline">Open Order Ops</span>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="sm"
              tooltip={collapsed ? getBackToShopLabel() : undefined}
              className="h-8 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg"
            >
              <a
                href={shopHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors w-full"
              >
                <ArrowLeft className="shrink-0 !size-[15px]" />
                <span className="truncate flex-1 text-left font-medium">
                  <span className="lg:hidden">{getBackToShopLabelShort()}</span>
                  <span className="hidden lg:inline">{getBackToShopLabel()}</span>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
// code:4ce0
