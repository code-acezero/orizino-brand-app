import React, { useState, useRef, useEffect } from "react";
import {
  User,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Sliders,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function UserProfileMenu({ compact = false }: { compact?: boolean }) {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch real profile avatar from profiles table
  const { data: profile } = useQuery({
    queryKey: ["user-profile-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase.from("profiles") as any)
        .select("id, full_name, avatar_url, phone")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const email = user?.email || "staff@orizino.com";
  const fullName = profile?.full_name || user?.user_metadata?.full_name || email.split("@")[0];
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const displayName = fullName.toUpperCase();
  const initials = displayName.slice(0, 2);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Avatar / Profile Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 p-1 rounded-2xl bg-secondary/60 hover:bg-secondary border border-border/70 text-foreground transition-all cursor-pointer active:scale-95 select-none"
        title={`Logged in as ${email}`}
        aria-label="User Profile"
      >
        <div className="relative w-7.5 h-7.5 rounded-xl bg-gradient-to-tr from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs font-mono overflow-hidden shrink-0">
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={fullName}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span>{initials}</span>
          )}
          {/* Online Status Dot */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
        </div>

        {!compact && (
          <div className="hidden sm:flex items-center gap-1 pr-1.5 text-left">
            <span className="text-xs font-bold text-foreground max-w-[90px] truncate">{fullName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
          </div>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-full sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-xs rounded-3xl bg-card/95 backdrop-blur-2xl border border-border/80 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* User Card */}
          <div className="p-4 border-b border-border/60 bg-gradient-to-b from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-base shadow-sm font-mono overflow-hidden shrink-0 border border-primary/20">
                {avatarUrl && !imgError ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground truncate">{fullName}</p>
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-[9px] font-mono uppercase font-bold">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{email}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  <span>Sales & Operations Staff</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-2 space-y-1 text-xs">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                <span className="text-xs font-medium">{copied ? "Email Copied!" : "Copy Staff Email"}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">{email}</span>
            </button>

            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">Open Master Panel</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">Port 3002</span>
            </a>
          </div>

          {/* Sign Out Button */}
          <div className="p-2 border-t border-border/50 bg-muted/20">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                void signOut();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
