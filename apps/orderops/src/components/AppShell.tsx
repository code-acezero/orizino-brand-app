import { useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  PackageSearch,
  ScanLine,
  Store,
  LogOut,
  Truck,
  Printer,
  RotateCcw,
  Layers,
  Headphones,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Search,
  Radio,
  Clock
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useBrandSettings } from "@/lib/brand";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { UserProfileMenu } from "./UserProfileMenu";
import { format } from "date-fns";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const PRIMARY_MOBILE_NAV: (NavItem & { isCenter?: boolean; isMore?: boolean })[] = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/orders", label: "Orders", icon: PackageSearch },
  { to: "/offline", label: "POS", icon: Store },
  { to: "/scanner", label: "Scanner", icon: ScanLine, isCenter: true },
  { to: "/stock", label: "Stocks", icon: Layers },
  { to: "/dispatch", label: "Courier", icon: Truck },
];

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
    ],
  },
  {
    title: "Sales & POS",
    items: [
      { to: "/offline", label: "Offline Orders", icon: Store, badge: "POS" },
      { to: "/scanner", label: "Orders Scanner", icon: ScanLine, badge: "Scan" },
    ],
  },
  {
    title: "Orders & Inventory",
    items: [
      { to: "/orders", label: "Orders Directory", icon: PackageSearch, badge: "Live" },
      { to: "/stock", label: "Stock & QR Serials", icon: Layers },
    ],
  },
  {
    title: "Shipping & Returns",
    items: [
      { to: "/labels", label: "Shipping Labels", icon: Printer },
      { to: "/dispatch", label: "Courier Dispatch", icon: Truck },
      { to: "/returns", label: "Returns & Exchange", icon: RotateCcw },
    ],
  },
  {
    title: "Support",
    items: [
      { to: "/support", label: "Customer Support", icon: Headphones, badge: "Live" },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const brand = useBrandSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get current active title
  const currentNav: NavItem | undefined = NAV_SECTIONS.flatMap((s) => s.items).find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* ── Desktop macOS-style Categorized Sidebar ── */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border/70 md:bg-sidebar md:shrink-0">
        {/* Brand Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-card border border-border/80 flex items-center justify-center p-1.5 shadow-2xs overflow-hidden shrink-0">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.siteName}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5 truncate font-display">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">{brand.siteName} Ops</span>
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span className="truncate font-mono">Counter Register #1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Categorized Nav Groups */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-1">
                {section.title}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-foreground/80 hover:bg-muted/60"
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-secondary/80 text-foreground/80 border border-border/50 font-mono">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer & User Profile */}
        <div className="p-3 space-y-2.5 border-t border-border/50 bg-card/30">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground shrink-0">
              Theme Mode
            </span>
            <div className="w-[145px]">
              <ThemeToggle />
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-foreground truncate">{user?.email?.split("@")[0] || "Operator"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Desktop Top Header Bar (No Theme Switch as requested) */}
        <header className="hidden md:flex items-center justify-between px-6 py-2.5 border-b border-border/70 bg-card/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/80">{brand.siteName || "OrderOps"}</span>
            <span className="text-border">/</span>
            <span className="font-medium text-foreground">{currentNav?.label || "Operations"}</span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5 text-muted-foreground/80">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(), "EEEE, MMM d, yyyy")}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg border border-border/60">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span className="text-[11px] font-medium text-foreground">Real-time Connected</span>
            </div>
            <NotificationBell />
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 bg-card px-2.5 py-1.5 rounded-xl border border-border/70 hover:border-primary/40 transition-all"
            >
              <span>Master Panel</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <UserProfileMenu />
          </div>
        </header>

        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-background/90 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-card border border-border/80 flex items-center justify-center p-1 shadow-2xs overflow-hidden shrink-0">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.siteName}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-tight truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">{brand.siteName} OrderOps</span>
              </p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <NotificationBell />
            <ThemeToggle compact />
            <UserProfileMenu compact />
          </div>
        </header>

        {/* Scrollable Page Body - Full width desktop layout */}
        <main className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6">
          <div className="w-full pb-6">{children}</div>
        </main>

        {/* iOS-Style Mobile Bottom Navigation */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-border/80 bg-background/95 backdrop-blur-xl px-1 pt-1 shadow-2xl"
          style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom, 8px))" }}
        >
          {PRIMARY_MOBILE_NAV.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            if (item.isCenter) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center -mt-5 relative z-10 select-none group px-1"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.7)] ring-4 ring-background scale-105"
                        : "bg-primary text-primary-foreground ring-4 ring-background shadow-md hover:scale-105"
                    }`}
                  >
                    <item.icon className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span
                    className={`text-[9px] font-bold mt-0.5 tracking-tight truncate max-w-[48px] ${
                      isActive ? "text-primary" : "text-foreground font-semibold"
                    }`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] font-semibold transition-all select-none ${
                  isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon
                  className={`w-4.5 h-4.5 transition-transform ${
                    isActive ? "scale-110 text-primary drop-shadow-xs" : ""
                  }`}
                />
                <span className="truncate max-w-[48px]">{item.label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] font-semibold text-muted-foreground transition-all select-none cursor-pointer hover:text-foreground"
          >
            <Menu className="w-4.5 h-4.5" />
            <span className="truncate max-w-[48px]">More</span>
          </button>
        </nav>

        {/* Mobile Full Operations Drawer / Modal */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-in fade-in duration-200">
            <div
              className="px-4 py-3 border-b border-border/60 flex items-center justify-between"
              style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-card border border-border/80 flex items-center justify-center p-1 shadow-2xs overflow-hidden shrink-0">
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.siteName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <h2 className="text-sm font-bold text-foreground">Operations Directory</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-1">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const isActive = item.end
                      ? location.pathname === item.to
                      : location.pathname.startsWith(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground font-bold shadow-md"
                            : "border-border/60 bg-card/60 text-foreground hover:bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-secondary text-primary"
                            }`}
                          >
                            <item.icon className="w-4.5 h-4.5" />
                          </div>
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-60" />
                      </NavLink>
                    );
                  })}
                </div>
              ))}

              <div className="pt-4 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30">
                  <span className="text-xs text-muted-foreground font-semibold">Theme Mode</span>
                  <div className="w-[155px]">
                    <ThemeToggle />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out ({user?.email})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
