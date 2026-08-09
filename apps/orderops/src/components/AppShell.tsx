import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, PackageSearch, ScanLine, Store, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/orders", label: "Orders", icon: PackageSearch },
  { to: "/offline", label: "Offline", icon: Store },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      {/* macOS-style sidebar — desktop only */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border/60 md:bg-sidebar md:shrink-0">
        <div className="px-5 pt-6 pb-4">
          <p className="text-[15px] font-semibold tracking-tight">Order Ops</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground/80 hover:bg-muted/60"
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-24 md:pb-8 md:px-8 md:pt-8">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>

        {/* iOS-style bottom tab bar — mobile only */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 ios-blur border-t border-border/60 flex items-stretch z-40"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5.5 h-5.5 ${isActive ? "scale-105" : ""} transition-transform`} strokeWidth={isActive ? 2.4 : 2} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
