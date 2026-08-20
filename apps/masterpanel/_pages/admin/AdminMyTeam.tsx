"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useServerFn } from "@/lib/server-fn-compat";
import { listStaff } from "@/lib/staff.functions";
import { listTeamsDetailed } from "@/lib/teams.functions";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import {
  Users2, ShieldCheck, Clock, UserCircle2, Building2,
  Briefcase, Mail, Phone, Shield, Sparkles, CheckCircle2,
  Package, ShoppingCart, Users, Palette, Globe, Bot, BarChart3, Settings2, Search,
} from "lucide-react";

const SECTION_ICONS: Record<string, React.ReactNode> = {
  products: <Package className="w-4 h-4" />,
  orders: <ShoppingCart className="w-4 h-4" />,
  offline_orders: <ShoppingCart className="w-4 h-4" />,
  customers: <Users className="w-4 h-4" />,
  affiliate: <Briefcase className="w-4 h-4" />,
  seo: <Search className="w-4 h-4" />,
  storefront_ui: <Palette className="w-4 h-4" />,
  portfolio: <Globe className="w-4 h-4" />,
  ai: <Bot className="w-4 h-4" />,
  analytics: <BarChart3 className="w-4 h-4" />,
  employees: <Users className="w-4 h-4" />,
  settings: <Settings2 className="w-4 h-4" />,
};

const SECTION_LABELS: Record<string, string> = {
  products: "Products & Catalog",
  orders: "Orders Fulfillment",
  offline_orders: "Offline Orders & POS",
  customers: "Customer Accounts",
  affiliate: "Affiliate Hub",
  seo: "Marketing & SEO",
  storefront_ui: "Brand & Storefront UI",
  portfolio: "Portfolio & CMS",
  ai: "AI Intelligence",
  analytics: "Reports & Analytics",
  employees: "Team & Access Control",
  settings: "System Settings",
};

export default function AdminMyTeam() {
  const { user } = useAuth();
  const fetchStaff = useServerFn(listStaff);
  const fetchTeams = useServerFn(listTeamsDetailed);

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetchStaff(),
  });

  const { data: allTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["admin-teams-detailed"],
    queryFn: async () => {
      try {
        const res = await fetchTeams();
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const currentMember = staff.find((s: any) => s.user_id === user?.id);
  const myTeams = allTeams.filter((t) => t.members.some((m) => m.user_id === user?.id));
  const isAdmin = currentMember?.roles.includes("admin") || currentMember?.roles.includes("master_admin");

  if (staffLoading || teamsLoading) {
    return (
      <div className="space-y-4 w-full">
        {[1, 2].map((i) => (
          <div key={i} className="h-44 rounded-xl border border-border/40 bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header Profile Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center font-bold text-2xl text-primary-foreground shadow-md shrink-0">
            {(currentMember?.full_name || user?.email || "U").charAt(0).toUpperCase()}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-foreground truncate">
                {currentMember?.full_name || "Team Member"}
              </h1>
              {currentMember?.roles.map((r: string) => (
                <Badge key={r} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {r}
                </Badge>
              ))}
            </div>

            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{user?.email}</span>
              {currentMember?.designation_title && (
                <>
                  <span>·</span>
                  <span className="text-foreground/90 font-medium">{currentMember.designation_title}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Breakdown Card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Your Section Access Permissions
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sections in Master Panel you are authorized to view and manage.
          </p>
        </div>

        {isAdmin ? (
          <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4 text-xs text-indigo-400 flex items-center gap-3">
            <Shield className="w-5 h-5 shrink-0" />
            <span>
              As a platform <strong>Admin</strong>, you have full, unrestricted permissions to every Control Panel section.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(SECTION_LABELS).map(([secKey, label]) => {
              const isDirect = currentMember?.direct_sections?.includes(secKey);
              const isTeam = currentMember?.team_sections?.includes(secKey);
              const hasAccess = isDirect || isTeam;

              if (!hasAccess) return null;

              return (
                <div
                  key={secKey}
                  className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5"
                >
                  <div className="p-2 rounded-md bg-primary/20 text-primary">
                    {SECTION_ICONS[secKey] || <Briefcase className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{label}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {isDirect ? "Direct grant" : "Inherited via team"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Department Teams */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Your Departments & Teams ({myTeams.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Departments you belong to along with your teammates and shared workflows.
          </p>
        </div>

        {myTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-card p-8 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p className="text-sm font-medium text-foreground">You have not been added to any department team</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your manager or system admin can add you to a department team.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {myTeams.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm space-y-4"
              >
                <div className="h-1.5 w-full" style={{ backgroundColor: team.color }} />

                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">{team.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{team.description || "Active department"}</p>
                    </div>
                  </div>

                  {/* Teammates list */}
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Teammates ({team.members.length})
                    </span>
                    <div className="space-y-1.5">
                      {team.members.map((m: any) => (
                        <div
                          key={m.user_id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-[10px] text-primary">
                              {(m.full_name || "M")[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground truncate">
                              {m.full_name || m.user_id.slice(0, 8)}
                            </span>
                            {m.user_id === user?.id && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1">You</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
