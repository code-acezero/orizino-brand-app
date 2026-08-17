import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  PackageSearch,
  ScanLine,
  Store,
  LogOut,
  Truck,
  Printer,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useBrandSettings } from "@/lib/brand";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/orders", label: "Fulfillment Queue", icon: PackageSearch },
  { to: "/scanner", label: "Scanner Terminal", icon: ScanLine },
  { to: "/dispatch", label: "Courier Dispatch", icon: Truck },
  { to: "/labels", label: "Slips & 4x6 Labels", icon: Printer },
  { to: "/returns", label: "Returns Intake", icon: RotateCcw },
  { to: "/offline", label: "Offline POS", icon: Store },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const brand = useBrandSettings();

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* macOS-style sidebar — desktop only */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border/60 md:bg-sidebar md:shrink-0">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-card border border-border/80 flex items-center justify-center p-1.5 shadow-xs overflow-hidden shrink-0">
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
              <p className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">{brand.siteName} Ops</span>
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
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
            <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">Appearance</p>
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

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar with theme toggle */}
        <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-card border border-border/80 flex items-center justify-center p-1 shadow-2xs overflow-hidden shrink-0">
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
              <p className="text-xs font-bold tracking-tight truncate">{brand.siteName} Ops</p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{user?.email}</p>
            </div>
          </div>
          <ThemeToggle compact />
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-24 md:pb-8 md:px-8 md:pt-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>

        {/* iOS-style bottom tab bar — mobile only */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 bg-background/90 backdrop-blur-xl border-t border-border/60 flex items-stretch overflow-x-auto no-scrollbar z-40"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-2 text-[9px] font-medium transition-colors ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4.5 h-4.5 ${isActive ? "scale-110 text-primary" : ""} transition-transform`} />
                  <span className="truncate max-w-[50px]">{item.label.split(" ")[0]}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
