"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffSections } from "@/hooks/use-staff-sections";
import { motion } from "framer-motion";
import {
  ShoppingCart, Search, Tag, Palette, Activity, Settings, Users2,
  LayoutGrid, ShieldCheck, ScanLine, ArrowUpRight,
} from "lucide-react";
import { SectionRow, type SectionRowItem } from "@/components/admin/SectionRow";
import { useScannerAccess } from "@/hooks/use-scanner-access";
import { NavLink } from "@/components/NavLink";

/**
 * ControlPanel — scoped panel for employees / staff.
 * Shows only the sections and teams they've been granted access to.
 */

const SECTION_META: Record<string, { title: string; sub: string; url: string; icon: any; color: string }> = {
  admin:        { title: "Sales & Operations", sub: "Products, orders, fulfilment & payments", url: "/sales",       icon: ShoppingCart, color: "#f59e0b" },
  products:     { title: "Products",         sub: "Catalog & inventory",                     url: "/sales/products-hub", icon: ShoppingCart, color: "#f59e0b" },
  orders:       { title: "Orders",           sub: "Fulfilment & tracking",                   url: "/sales/orders",       icon: ShoppingCart, color: "#f59e0b" },
  customers:    { title: "Customers",        sub: "Accounts, notes & tags",                  url: "/sales/customers-hub",icon: Users2,       color: "#a855f7" },
  analytics:    { title: "Analytics",        sub: "Sales & behavior insights",               url: "/sales/customer-analytics", icon: Activity, color: "#38bdf8" },
  seo:          { title: "Marketing Management", sub: "Search, tracking, ads & announcements", url: "/marketing",                icon: Search,       color: "#f97316" },
  affiliate:    { title: "Affiliate Program", sub: "Partners & commissions",                 url: "/affiliate",          icon: Tag,          color: "#84cc16" },
  storefront_ui:{ title: "Brand & Storefront", sub: "Theme, banners, appearance",            url: "/brand",        icon: Palette,      color: "#ec4899" },
  portfolio:    { title: "Landing / Docs",     sub: "Company site editor",                    url: "/brand/landing",icon: Palette,      color: "#ec4899" },
  settings:     { title: "Settings & AI",    sub: "Global config",                           url: "/settings-ai",           icon: Settings,     color: "#94a3b8" },
  ai:           { title: "AI Agent",         sub: "Widget & memory config",                  url: "/settings-ai/ai-settings", icon: Settings,   color: "#94a3b8" },
  employees:    { title: "Team & Access",    sub: "Roles & access",                          url: "/team/employees",icon: Users2,       color: "#a855f7" },
};


export default function ControlPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: staff } = useStaffSections();

  const { data: profile } = useQuery({
    queryKey: ["staff-profile", user?.id],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: myTeams } = useQuery({
    queryKey: ["my-teams", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: memberships } = await (supabase as any)
        .from("team_members")
        .select("team_id, teams(id, name, color, description)")
        .eq("user_id", user!.id);
      return (memberships ?? []).map((m: any) => m.teams).filter(Boolean);
    },
  });

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const accessible: SectionRowItem[] = (staff?.accessible ?? []).map((s: any) => {
    const meta = SECTION_META[s.key] ?? { title: s.label || s.key, sub: s.description || "", url: s.url || `/${s.key}`, icon: LayoutGrid, color: "#64748b" };
    return { key: s.key, title: meta.title, sub: meta.sub, url: meta.url, icon: meta.icon, color: meta.color };
  });

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Header — pill removed, sidebar/topbar already show the panel identity */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="text-xl sm:text-2xl md:text-3xl font-display font-bold"
        >
          {greeting}, {firstName}
        </motion.h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Your workspace — only the tools and teams you have access to.
        </p>
      </div>

      <ScannerShortcut />


      {/* Teams */}
      {myTeams && myTeams.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">
            Your Teams
          </p>
          <div className="flex flex-wrap gap-2">
            {myTeams.map((t: any) => (
              <button
                key={t.id}
                onClick={() => navigate({ to: "/team/my-team" })}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 hover:bg-card hover:border-border transition-all"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: t.color || "#a855f7" }}
                />
                <span className="text-xs font-medium text-foreground">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Accessible sections */}
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">
          Your Sections
        </p>

        {accessible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-4 py-8 text-center">
            <ShieldCheck className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No sections assigned yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Ask your admin to grant you access.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {accessible.map((s, i) => (
              <SectionRow key={s.key} item={s} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScannerShortcut() {
  const { allowed } = useScannerAccess(false);
  if (!allowed) return null;
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Quick Tools</p>
      <NavLink
        to="/scanner"
        className="group flex items-center gap-3 rounded-xl border border-[#c8102e]/25 bg-gradient-to-br from-[#c8102e]/10 to-transparent px-4 py-3 hover:from-[#c8102e]/15 hover:border-[#c8102e]/50 transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-[#c8102e]/15 border border-[#c8102e]/40 flex items-center justify-center shrink-0">
          <ScanLine className="w-4 h-4 text-[#ff5064]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Barcode Scanner</p>
          <p className="text-[11px] text-muted-foreground">Standalone scanner · installable</p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </NavLink>
    </div>
  );
}

// code:4ce0
