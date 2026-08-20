"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "@/lib/router-compat";
import AutoSkeleton from "@/components/skeletons/AutoSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavLink } from "@/components/NavLink";
import {
  Menu,
  Search,
  LogOut,
  ChevronDown,
  Command,
  Zap,
  ArrowLeft,
  User,
} from "lucide-react";
import { adminNav, mobilePrimary, allAdminItems, allAdminDestinations, type AdminNavItem } from "./admin-nav";
import { AdminCommandPalette } from "./AdminCommandPalette";
import { useStaffSections } from "@/hooks/use-staff-sections";
import { LayoutGrid } from "lucide-react";
import UniversalFloatingSaveButton from "./UniversalFloatingSaveButton";

// Mirror desktop AdminSidebar: only show nav sections relevant to the current URL segment.
import {
  SECTION_LABELS,
  SEGMENT_TO_NAV_LABELS,
  SECTION_LANDING_PATHS,
} from "@/lib/master-sections";

const ALL_NAV_LABELS = SEGMENT_TO_NAV_LABELS.master;

const splitNavUrl = (url: string) => {
  const [path, query = ""] = url.split("?");
  return { path: path.replace(/\/+$/, "") || "/", query };
};

const AdminMobileShell: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAdminRole();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [isPhone, setIsPhone] = useState(false);

  // Phone (<640px) gets fewer bottom-tab slots than tablet
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(max-width: 639px)");
    const update = () => setIsPhone(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);


  const { data: profile } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-admin-mobile"],
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
  const siteName = (siteSettings?.site_name as string) || "";
  const logoUrl =
    (siteSettings?.logo_url as string) || (siteSettings?.site_icon_url as string) || "/orizino-logo.svg";

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  const firstName = (profile?.full_name || "").split(" ")[0] || "Admin";

  const pageMeta = useMemo(() => {
    const normalisedPath = location.pathname.replace(/\/+$/, "") || "/";
    const match = [...allAdminDestinations]
      .sort((a, b) => splitNavUrl(b.url).path.length - splitNavUrl(a.url).path.length)
      .find((i) => {
        const { path } = splitNavUrl(i.url);
        return path === "/" ? normalisedPath === "/" : normalisedPath === path || normalisedPath.startsWith(path + "/");
      });
    return match ?? { title: "Admin", description: "", icon: undefined };
  }, [location.pathname]);

  const isRoot = location.pathname === "/";

  const mobileSectionLabel = (() => {
    const seg = location.pathname.replace(/\/+$/, "").split("/")[1] ?? "";
    if (seg === "") return "Master Panel";
    return SECTION_LABELS[seg] ?? "Admin";
  })();
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

  const isActive = (url: string) => {
    const { path, query } = splitNavUrl(url);
    if (query) {
      if (pathMatches(path, true)) {
        if (searchMatches(query)) return true;
        if ((!location.search || location.search === "?") && query === "tab=dashboard") return true;
      }
      return false;
    }
    if (SECTION_LANDING_PATHS.has(path)) return pathMatches(path, true);
    return pathMatches(path);
  };

  const isChildActive = (childUrl: string, siblings?: Array<{ url: string }>) => {
    const { path, query } = splitNavUrl(childUrl);
    if (!pathMatches(path, !!query)) return false;
    if (query) return searchMatches(query);

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

  const isDefaultChild = (childUrl: string, idx: number) => {
    if (idx !== 0) return false;
    const { path, query } = splitNavUrl(childUrl);
    if (!pathMatches(path, true)) return false;
    const target = Array.from(new URLSearchParams(query).entries());
    if (target.length === 0) return false;
    const current = new URLSearchParams(location.search);
    const defaultKey = target[target.length - 1][0];
    if (current.has(defaultKey)) return false;
    return target.slice(0, -1).every(([key, value]) => current.get(key) === value);
  };

  const hasActiveDescendant = (item: AdminNavItem): boolean => {
    if (!item.children?.length) return false;
    return item.children.some(
      (child, idx) => isChildActive(child.url, item.children) || isDefaultChild(child.url, idx) || hasActiveDescendant(child as AdminNavItem),
    );
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Working late";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  }, []);

  const isPrimaryActive = (url: string) => isActive(url);

  const { data: staff } = useStaffSections();
  const canSeeMasterControl =
    !!staff?.isAdmin || role === "admin" || (staff?.accessible?.length ?? 0) >= 2;

  const isProductShippingPaymentsRoute = useMemo(() => {
    const clean = location.pathname.replace(/\/+$/, "");
    const search = location.search;
    return (
      clean.startsWith("/sales/products") ||
      clean.startsWith("/sales/categories") ||
      clean.startsWith("/sales/stock") ||
      clean.startsWith("/sales/invoice-stickers") ||
      clean.startsWith("/sales/coupons") ||
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
  }, [location.pathname, location.search]);

  const visibleNavLabels = useMemo(() => {
    if (query.trim()) return null;
    const clean = location.pathname.replace(/\/+$/, "");
    if (clean === "/settings-ai" || clean.startsWith("/settings-ai") || clean === "/settings" || clean.startsWith("/settings") || clean.startsWith("/sales/payment-gateways")) {
      return ["Settings & AI"];
    }
    if (isProductShippingPaymentsRoute) return ["PSO Management"];
    const seg = clean.split("/")[1] ?? "";
    if (seg === "sales") return ["Sales & Customers"];
    return SEGMENT_TO_NAV_LABELS[seg] ?? ["Master Controls"];
  }, [location.pathname, isProductShippingPaymentsRoute, query]);

  const isMasterPanelHome = location.pathname === "/";

  const filterItems = (items: AdminNavItem[]) => {
    const isAdmin = !!staff?.isAdmin || role === "admin";
    const hasAnyGrant = (staff?.accessible?.length ?? 0) > 0;
    const sectionFiltered = items.filter((i) => {
      if (isAdmin) return true;
      if (i.url === "/" || i.url === "/master") return true;
      if (i.section) return staff?.hasAccess(i.section) ?? false;
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

  useEffect(() => {
    const next: Record<string, boolean> = {};
    const walk = (item: AdminNavItem) => {
      if (!item.children?.length) return;
      if (item.url === "/master") {
        next[item.url] = isMasterPanelHome;
        item.children.forEach((child) => walk(child as AdminNavItem));
        return;
      }
      if (isActive(item.url) || hasActiveDescendant(item)) next[item.url] = true;
      item.children.forEach((child) => walk(child as AdminNavItem));
    };
    adminNav.forEach((section) => section.items.forEach(walk));
    setOpenGroups((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, location.search]);

  // Close sheet on route change
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname, location.search]);

  // Lock body scroll behavior + native-feel touch
  useEffect(() => {
    document.body.style.overscrollBehaviorY = "contain";
    return () => {
      document.body.style.overscrollBehaviorY = "";
    };
  }, []);

  return (
    <div
      className="admin-layout-root relative h-[100dvh] flex flex-col w-full bg-background overflow-clip"
      style={{ paddingTop: "env(safe-area-inset-top)", width: "100dvw" }}
    >
      {/* Ambient gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px] opacity-80"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, hsl(var(--primary)/0.18) 0%, hsl(var(--primary)/0.06) 35%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full blur-3xl opacity-40"
        style={{ background: "hsl(var(--primary)/0.35)" }}
      />

      {/* Top app bar — glass */}
      <header
        className="sticky top-0 z-30 flex items-center px-2 sm:px-3 h-14 gap-1.5 sm:gap-2 w-full max-w-full overflow-hidden bg-background/80 backdrop-blur-xl border-b border-border/40 shrink-0"
        style={{ top: "env(safe-area-inset-top)" }}
      >
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 text-foreground shadow-sm active:scale-95 transition"
              aria-label="Open menu"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="w-[320px] p-0 flex flex-col bg-background border-r border-border/60"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="px-4 py-3.5 border-b border-border/40 flex items-center gap-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={siteName}
                  className="w-7 h-7 object-contain shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-xs shrink-0">
                  <span className="text-primary-foreground font-bold text-xs">
                    {(siteName || "A").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-display text-sm font-bold leading-tight tracking-tight">
                  Control Center
                </h2>
                <p className="text-[9.5px] text-muted-foreground uppercase tracking-widest leading-tight mt-0.5 font-medium">
                  {role === "moderator" ? "Moderator" : "Admin"}
                </p>
              </div>
            </div>

            <div className="px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search admin…"
                  className="w-full h-10 pl-9 pr-3 text-sm rounded-2xl bg-muted/50 border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                />
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
              {!isMasterPanelHome && canSeeMasterControl && (
                <NavLink
                  to="/"
                  end
                  className="flex items-center gap-3 h-11 px-3 rounded-2xl text-[14px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition active:scale-[0.99]"
                >
                  <LayoutGrid className="w-[17px] h-[17px] shrink-0" />
                  <span className="truncate">Back to Master Panel</span>
                </NavLink>
              )}
              {adminNav.map((section) => {
                if (!visibleNavLabels.includes(section.label)) return null;
                const items = filterItems(section.items);
                if (!items.length) return null;
                return (
                  <div key={section.label} className="pb-1">
                    <div className="px-3 h-7 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 font-semibold flex items-center">
                      {section.label}
                    </div>
                    {items.map((item) => {
                      const hasChildren = !!item.children?.length;
                      const descendantActive = hasChildren && hasActiveDescendant(item);
                      const ownActive = isActive(item.url);
                      const active = ownActive && !descendantActive;
                      const isMasterItem = item.url === "/master";
                      const defaultOpen = isMasterItem
                        ? isMasterPanelHome
                        : (ownActive || descendantActive);
                      const open = openGroups[item.url] ?? defaultOpen;
                      return (
                        <div key={item.url}>
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() =>
                                setOpenGroups((p) => ({ ...p, [item.url]: !(p[item.url] ?? open) }))
                              }
                              className={`w-full flex items-center gap-3 h-11 px-3 rounded-2xl text-[14px] transition active:scale-[0.99] ${
                                active
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "text-foreground hover:bg-muted/50"
                              }`}
                            >
                              <item.icon className="w-[17px] h-[17px] shrink-0" />
                              <span className="flex-1 text-left truncate">{item.title}</span>
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                              />
                            </button>
                          ) : (
                            <NavLink
                              to={item.url}
                              end={item.url === "/"}
                              className={`flex items-center gap-3 h-11 px-3 rounded-2xl text-[14px] transition active:scale-[0.99] ${
                                active
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "text-foreground hover:bg-muted/50"
                              }`}
                            >
                              <item.icon className="w-[17px] h-[17px] shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </NavLink>
                          )}
                          {hasChildren && open && (
                            <div className="ml-7 pl-3 border-l border-border/40 mt-1 mb-1.5 space-y-0.5">
                              {item.children!.map((child, idx) => {
                                const hasSub = !!child.children?.length;
                                const subActive = hasSub && child.children!.some(
                                  (sub, sIdx) => isChildActive(sub.url) || isDefaultChild(sub.url, sIdx),
                                );
                                const childOwnActive = isChildActive(child.url) || isDefaultChild(child.url, idx);
                                const childActive = childOwnActive && !subActive;
                                const subOpen = openGroups[child.url] ?? (childOwnActive || subActive);

                                return (
                                  <div key={child.url}>
                                    <NavLink
                                      to={child.url}
                                      className={`flex items-center h-9 px-3 rounded-xl text-[13px] transition-colors ${
                                        childActive
                                          ? "bg-primary/10 text-primary font-semibold"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                      }`}
                                    >
                                      <span className="truncate">{child.title}</span>
                                    </NavLink>
                                    {hasSub && subOpen && (
                                      <div className="ml-3 pl-3 border-l border-border/30 mt-0.5 space-y-0.5">
                                        {child.children!.map((sub, sIdx) => {
                                          const subItemActive = isChildActive(sub.url) || isDefaultChild(sub.url, sIdx);
                                          return (
                                            <NavLink
                                              key={sub.url}
                                              to={sub.url}
                                              className={`flex items-center h-8 px-3 rounded-lg text-[12px] transition-colors ${
                                                subItemActive
                                                  ? "bg-primary/10 text-primary font-semibold"
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
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

            <div className="p-3 border-t border-border/40 flex items-center gap-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Admin"
                  className="w-10 h-10 rounded-2xl object-cover ring-2 ring-border/60"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary-foreground">{initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0 leading-tight">
                <p className="text-sm font-semibold truncate">{profile?.full_name || "Admin"}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {role === "moderator" ? "Moderator" : "Administrator"}
                </p>
              </div>
              <button
                onClick={() => {
                  signOut();
                  navigate("/auth");
                }}
                className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 min-w-0 px-2 flex flex-col justify-center overflow-hidden">
          <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80 leading-none truncate mb-1">
            {isRoot ? greeting : mobileSectionLabel}
          </p>
          <h1 className="text-sm font-bold text-foreground truncate tracking-tight leading-tight">
            {isRoot ? `Hi, ${firstName}` : pageMeta.title}
          </h1>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="h-10 w-10 shrink-0 flex items-center justify-center rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 text-foreground shadow-sm active:scale-95 transition"
          aria-label="Command palette"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
        <div className="h-10 w-10 shrink-0 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 shadow-sm flex items-center justify-center relative z-10">
          <NotificationBell adminMode />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative h-10 w-10 shrink-0 flex items-center justify-center rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 shadow-sm active:scale-95 transition"
              aria-label="Open admin profile"
            >
              <span className="absolute inset-0 rounded-2xl overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile?.full_name || "Admin"}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[11px] font-bold text-primary-foreground w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary/60">
                    {initials}
                  </span>
                )}
              </span>
              
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="w-48 rounded-2xl border-border/60 bg-card/95 backdrop-blur-xl shadow-xl"
          >
            <DropdownMenuLabel className="text-xs font-semibold px-3 py-2">
              {profile?.full_name || "Admin"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              onClick={() => navigate("/master/profile")}
              className="rounded-xl px-3 py-2.5 text-sm cursor-pointer focus:bg-accent/80"
            >
              <User className="w-4 h-4 mr-2.5 text-muted-foreground" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                signOut();
                navigate("/auth");
              }}
              className="rounded-xl px-3 py-2.5 text-sm cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Hero row — only on dashboard root */}
      {isRoot && (
        <section className="relative z-10 px-4 pt-1 pb-3">
          <div className="rounded-3xl p-4 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/20 backdrop-blur-md flex items-center gap-3 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.35)]">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-500" />
                </span>
                Live system
              </p>
              <p className="text-[13px] text-foreground/90 mt-1 leading-snug">
                Everything is running smoothly.
              </p>
            </div>
            <button
              onClick={() => setPaletteOpen(true)}
              className="shrink-0 h-10 px-3.5 rounded-2xl bg-foreground text-background text-[12px] font-semibold flex items-center gap-1.5 active:scale-95 transition shadow-lg"
            >
              <Zap className="w-3.5 h-3.5" />
              Quick
            </button>
          </div>
        </section>
      )}

      {/* Non-root page sub-header with back chip */}
      {!isRoot && (
        <section className="relative z-10 px-4 pt-1 pb-2">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-card/70 backdrop-blur-md border border-border/50 text-[11px] font-medium text-muted-foreground hover:text-foreground active:scale-95 transition"
          >
            <ArrowLeft className="w-3 h-3" />
            Dashboard
          </button>
        </section>
      )}

      {/* Main content */}
      <main
        className="relative z-10 flex-1 px-2.5 sm:px-3 overflow-y-auto overflow-x-hidden min-h-0 touch-pan-y"
        style={{
          paddingBottom: "calc(84px + env(safe-area-inset-bottom))",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <React.Suspense fallback={<AutoSkeleton />}>
          {children}
        </React.Suspense>
      </main>

      {/* Sticky bottom tab bar (edge-to-edge, 7 slots) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-2xl border-t border-border/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-[64px] px-1">
          {(() => {
            // Phone: 5 primary + FAB + More = 7 slots. Tablet: 7 primary + FAB + More = 9 slots.
            const primary = isPhone ? mobilePrimary.slice(0, 5) : mobilePrimary;
            const halves = Math.ceil(primary.length / 2);
            const left = primary.slice(0, halves);
            const right = primary.slice(halves);


            const renderItem = (d: (typeof mobilePrimary)[number]) => {
              const active = isPrimaryActive(d.url);
              return (
                <button
                  key={d.url}
                  onClick={() => navigate(d.url)}
                  className="relative flex-1 min-w-0 h-full flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
                  aria-label={d.title}
                >
                  <div
                    className={`flex items-center justify-center w-9 h-7 rounded-xl transition-all ${
                      active ? "bg-muted text-foreground font-semibold border border-border/60" : "text-muted-foreground"
                    }`}
                  >
                    <d.icon className="w-[17px] h-[17px]" />
                  </div>
                  <span
                    className={`text-[9px] font-medium leading-none truncate max-w-full px-0.5 ${
                      active ? "text-foreground font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {d.title}
                  </span>
                  {active && (
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            };

            return (
              <>
                {left.map(renderItem)}
                {/* Center FAB */}
                <button
                  onClick={() => setPaletteOpen(true)}
                  className="relative flex-1 min-w-0 h-full flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Command palette"
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.7)] -mt-3">
                    <Command className="w-[20px] h-[20px]" />
                  </span>
                </button>
                {right.map(renderItem)}
                <button
                  onClick={() => setSheetOpen(true)}
                  className="flex-1 min-w-0 h-full flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
                  aria-label="More"
                >
                  <div className="flex items-center justify-center w-9 h-7 rounded-xl text-muted-foreground">
                    <Menu className="w-[17px] h-[17px]" />
                  </div>
                  <span className="text-[9px] font-medium leading-none text-muted-foreground">
                    More
                  </span>
                </button>
              </>
            );
          })()}
        </div>
      </nav>

      <UniversalFloatingSaveButton />
      <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
};

export default AdminMobileShell;
// code:4ce0
