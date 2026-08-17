"use client";
import React from "react";
import { useNavigate } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Command, Activity, Keyboard, User, ChevronDown, Bell, IdCard, Sun, Moon, Monitor, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { useRealtimeVisitors } from "@/hooks/use-realtime-visitors";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/NotificationBell";
import LanguageMenu from "@/components/footer/LanguageMenu";
import { PresenceAvatars } from "./PresenceAvatars";
import StatusDot from "./StatusDot";
import { cn } from "@/lib/utils";

interface Props {
  /** Slot rendered after the sidebar trigger — usually breadcrumb or brand. */
  leading?: React.ReactNode;
  /** Slot rendered between leading and actions — e.g. a panel switcher. */
  center?: React.ReactNode;
  /** Show the ⌘K command-palette trigger. */
  showCommand?: boolean;
  onOpenPalette?: () => void;
  /** Show the keyboard-shortcuts button. */
  showShortcuts?: boolean;
  onOpenShortcuts?: () => void;
  /** Show presence avatars (default true). */
  showPresence?: boolean;
  className?: string;
}

const REALTIME_META = {
  live: { label: "Live", tone: "success", cls: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]", ping: true },
  connecting: { label: "Connecting", tone: "warning", cls: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]", ping: true },
  offline: { label: "Offline", tone: "muted", cls: "bg-muted text-muted-foreground", ping: false },
} as const;

/**
 * Shared admin top bar. Extracted from AdminLayout + MasterPanelLayout, which
 * previously duplicated identical profile / realtime / palette / signout UI.
 */
const AdminTopBar: React.FC<Props> = ({
  leading,
  center,
  showCommand = true,
  onOpenPalette,
  showShortcuts = false,
  onOpenShortcuts,
  showPresence = true,
  className,
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const role = useAdminRole();
  const realtimeStatus = useRealtimeStatus();
  const visitors = useRealtimeVisitors();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  const modKey = isMac ? "⌘" : "Ctrl";

  const { data: profile, isLoading: profileLoading } = useQuery({
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

  const queryClient = useQueryClient();
  const { data: modeSetting = "auto" } = useQuery({
    queryKey: ["site-mode-admin-topbar"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .eq("key", "site_mode")
        .maybeSingle();
      const val = data?.value;
      return (typeof val === "object" && val !== null ? (val as any).value ?? val : val) || "auto";
    },
    staleTime: 30 * 1000,
  });

  const currentMode = String(modeSetting || "auto");

  const applySiteMode = async (targetMode: "auto" | "light" | "dark") => {
    const isAuto = targetMode === "auto";
    const systemIsDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effectiveIsLight = isAuto ? !systemIsDark : targetMode === "light";

    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", effectiveIsLight);
      window.dispatchEvent(
        new CustomEvent("site-mode-change", {
          detail: { mode: targetMode, resolvedMode: effectiveIsLight ? "light" : "dark" },
        })
      );
    }

    queryClient.setQueryData(["site-mode-admin-topbar"], targetMode);
    queryClient.setQueryData(["site-settings"], (old: any) => ({
      ...(old || {}),
      site_mode: targetMode,
    }));

    await supabase.from("site_settings").upsert(
      { key: "site_mode", value: { value: targetMode } },
      { onConflict: "key" }
    );
    queryClient.invalidateQueries({ queryKey: ["site-mode-admin-topbar"] });
    queryClient.invalidateQueries({ queryKey: ["site-settings"] });
  };

  const showProfileSkeleton = !!user && profileLoading;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "";
  const initials = firstName ? firstName.slice(0, 2).toUpperCase() : "AD";

  const rt = REALTIME_META[realtimeStatus];

  return (
    <header
      className={cn(
        "h-14 flex items-center gap-1.5 sm:gap-2 border-b border-border/60 px-2 sm:px-4 bg-background/70 backdrop-blur-xl sticky top-0 z-30 w-full max-w-full shrink-0",
        className,
      )}
    >
      <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />

      {leading && <div className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">{leading}</div>}
      {center && <div className="shrink-0 flex items-center">{center}</div>}

      {showCommand && onOpenPalette && (
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden xl:flex ml-2 items-center gap-2 h-8 pl-2.5 pr-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground transition-colors min-w-[180px] shrink-0"
          aria-label="Open command palette"
        >
          <Command className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Quick jump…</span>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded bg-background border border-border/60 text-[10px] font-mono text-muted-foreground">
            <span aria-hidden>{modKey}</span>
            <span>K</span>
          </kbd>
        </button>
      )}
      {showCommand && onOpenPalette && (
        <button
          type="button"
          onClick={onOpenPalette}
          className="xl:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
          aria-label="Open command palette"
          title="Quick jump"
        >
          <Command className="w-4 h-4" />
        </button>
      )}


      <div className="ml-auto flex items-center gap-1 sm:gap-2 min-w-0">
        {showPresence && <PresenceAvatars currentName={profile?.full_name || user?.email} />}

        {/* Live Storefront Visitors Pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          role="status"
          aria-live="polite"
          title={`Storefront Live Visitors: ${visitors}`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" aria-hidden />
          <span className="font-mono font-bold">{visitors}</span>
          <span className="text-foreground/80 font-medium">Live</span>
        </div>
        {/* Compact realtime badge on small screens */}
        <div
          className="sm:hidden inline-flex items-center gap-1 h-7 px-2 rounded-full shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          role="status"
          aria-live="polite"
          title={`Storefront Live Visitors: ${visitors}`}
        >
          <Activity className="w-3 h-3 text-emerald-500 animate-pulse" aria-hidden />
          <span className="text-[11px] font-mono font-bold">{visitors}</span>
        </div>

        {showShortcuts && onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            className="hidden lg:inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={`Theme: ${currentMode === "auto" ? "Auto (System)" : currentMode === "light" ? "Light Mode" : "Dark Mode"}`}
              aria-label="Toggle theme mode"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 cursor-pointer active:scale-95 outline-none"
            >
              {currentMode === "auto" ? (
                <Monitor className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              ) : currentMode === "light" ? (
                <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 p-1 rounded-xl shadow-xl border-border/80">
            <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
              Theme Mode
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => applySiteMode("auto")}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer",
                currentMode === "auto" && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-emerald-500" />
                <span>Auto (System)</span>
              </div>
              {currentMode === "auto" && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => applySiteMode("light")}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer",
                currentMode === "light" && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light Mode</span>
              </div>
              {currentMode === "light" && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => applySiteMode("dark")}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer",
                currentMode === "dark" && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark Mode</span>
              </div>
              {currentMode === "dark" && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationBell adminMode />

        <div className="hidden lg:block h-6 w-px bg-border/60 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 pl-1 pr-1 sm:pr-2 h-10 rounded-lg hover:bg-muted/60 transition-colors min-w-0 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              aria-label="Open account menu"
            >
              {showProfileSkeleton ? (
                <div
                  className="w-8 h-8 rounded-full bg-muted animate-pulse ring-2 ring-border/40 shrink-0"
                  aria-label="Loading profile"
                />
              ) : profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-border/60 shrink-0"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center ring-2 ring-border/40 shrink-0"
                  aria-hidden
                >
                  <span className="text-xs font-semibold text-primary-foreground">{initials}</span>
                </div>
              )}
              <div className="hidden lg:flex flex-col leading-tight min-w-0 max-w-[120px] xl:max-w-[160px] text-left">
                {showProfileSkeleton ? (
                  <>
                    <div className="h-3 w-16 md:w-20 rounded bg-muted animate-pulse" />
                    <div className="hidden md:block mt-1 h-2.5 w-14 rounded bg-muted/70 animate-pulse" />
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-foreground truncate capitalize">{firstName || "Admin"}</p>
                    <p className="hidden md:block text-[10px] text-muted-foreground capitalize truncate">
                      {role === "moderator" ? "Moderator" : "Administrator"}
                    </p>
                  </>
                )}
              </div>
              <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium capitalize truncate">{firstName || "Admin"}</span>
              {user?.email && (
                <span className="text-[11px] font-normal text-muted-foreground truncate">{user.email}</span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/master/profile")} className="cursor-pointer">
              <User className="w-4 h-4 mr-2" aria-hidden />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/master/profile?tab=identity")} className="cursor-pointer">
              <IdCard className="w-4 h-4 mr-2" aria-hidden />
              Public identity
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/settings-ai/notifications")} className="cursor-pointer">
              <Bell className="w-4 h-4 mr-2" aria-hidden />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                signOut();
                navigate("/auth");
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminTopBar;
// code:4ce0
