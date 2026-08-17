import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useBrandSettings } from "@/lib/brand";
import { ThemeToggle } from "./ThemeToggle";

const PRIMARY_MOBILE_NAV = [
  { to: "/offline", label: "POS", icon: Store },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/orders", label: "Orders", icon: PackageSearch },
  { to: "/support", label: "Support", icon: Headphones },
];

const ALL_NAV = [
  { to: "/offline", label: "Offline POS", icon: Store, group: "Sales & Counter" },
  { to: "/scanner", label: "Scanner Terminal", icon: ScanLine, group: "Sales & Counter" },
  { to: "/", label: "Dashboard", icon: LayoutGrid, group: "Overview", end: true },
  { to: "/orders", label: "Fulfillment Queue", icon: PackageSearch, group: "Operations" },
  { to: "/stock", label: "Stock & Serials", icon: Layers, group: "Operations" },
  { to: "/support", label: "Support Inbox", icon: Headphones, group: "Operations" },
  { to: "/labels", label: "Slips & 4x6 Labels", icon: Printer, group: "Logistics" },
  { to: "/dispatch", label: "Courier Dispatch", icon: Truck, group: "Logistics" },
  { to: "/returns", label: "Returns Intake", icon: RotateCcw, group: "Logistics" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const brand = useBrandSettings();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop macOS-style Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border/60 md:bg-sidebar md:shrink-0">
        <div className="px-5 pt-6 pb-4">
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
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {ALL_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-foreground/80 hover:bg-muted/60"
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 space-y-2 border-t border-border/40">
          <div className="px-1">
            <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Appearance
            </p>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm text-muted-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
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
              <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle compact />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-xl bg-secondary/60 border border-border/60 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              aria-label="Open operations menu"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main
          className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 pt-3 sm:pt-6"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 72px)",
          }}
        >
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>

        {/* iOS-Style Mobile Bottom Dock */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 bg-background/92 backdrop-blur-2xl border-t border-border/60 flex items-stretch z-40"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        >
          {PRIMARY_MOBILE_NAV.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-all select-none ${
                  isActive ? "text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? "scale-110 text-primary drop-shadow-sm" : ""
                  }`}
                />
                <span className="truncate max-w-[60px]">{item.label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold text-muted-foreground transition-all select-none cursor-pointer"
          >
            <Menu className="w-5 h-5" />
            <span className="truncate">More</span>
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

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {ALL_NAV.map((item) => {
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

              <div className="pt-4 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/30">
                  <span className="text-xs text-muted-foreground font-semibold">Theme Mode</span>
                  <ThemeToggle />
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
