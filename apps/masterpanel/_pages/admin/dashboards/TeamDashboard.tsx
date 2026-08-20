"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/server-fn-compat";
import { listStaff, listAuditLog } from "@/lib/staff.functions";
import { listTeamsDetailed } from "@/lib/teams.functions";
import { listDesignations } from "@/lib/designations.functions";
import { useNavigate } from "@/lib/router-compat";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users2, ShieldCheck, ClipboardList, Building2, KeyRound,
  UserPlus, Plus, Shield, ArrowRight, Activity, Award, CheckCircle2,
  ChevronRight, Lock, Sparkles, Layers,
} from "lucide-react";

export default function TeamDashboard() {
  const navigate = useNavigate();
  const fetchStaff = useServerFn(listStaff);
  const fetchTeams = useServerFn(listTeamsDetailed);
  const fetchAudit = useServerFn(listAuditLog);
  const fetchDesignations = useServerFn(listDesignations);

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetchStaff(),
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["admin-teams-detailed"],
    queryFn: () => fetchTeams(),
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["team-audit-feed"],
    queryFn: () => fetchAudit({ data: { limit: 8, offset: 0 } }),
  });

  const { data: presets = [] } = useQuery({
    queryKey: ["staff-presets"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_role_presets").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["designations-count"],
    queryFn: () => fetchDesignations(),
  });

  const masterAdminsCount = staff.filter((s: any) => s.roles.includes("master_admin")).length;
  const adminsCount = staff.filter((s: any) => s.roles.includes("admin")).length;
  const totalDirectGrants = staff.reduce((acc: number, s: any) => acc + (s.direct_sections?.length || 0), 0);

  const roleCounts: Record<string, number> = {
    master_admin: 0,
    admin: 0,
    manager: 0,
    moderator: 0,
    support: 0,
    marketing: 0,
    maintainer: 0,
  };

  staff.forEach((s: any) => {
    s.roles.forEach((r: string) => {
      if (roleCounts[r] !== undefined) roleCounts[r]++;
    });
  });

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <ShieldCheck className="w-3.5 h-3.5" /> Enterprise RBAC & Security Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Users2 className="w-7 h-7 text-primary" /> Team & Access Command Center
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Orchestrate employee roles, department hierarchies, fine-grained section permissions, and real-time security audit trails across the entire brand operations.
            </p>
          </div>

          {/* Rapid Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              onClick={() => navigate("/team/employees?action=add")}
              className="gap-2 shadow-sm font-medium h-9"
            >
              <UserPlus className="w-4 h-4" /> Invite Staff
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/team/teams?action=create")}
              className="gap-2 h-9"
            >
              <Plus className="w-4 h-4" /> Create Team
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/team/access")}
              className="gap-2 h-9"
            >
              <KeyRound className="w-4 h-4 text-primary" /> Access Matrix
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate("/team/employees")}
          className="rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm p-4 cursor-pointer hover:border-primary/40 transition-all space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Staff</span>
            <Users2 className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {staffLoading ? "..." : staff.length}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {masterAdminsCount} Master · {adminsCount} Admin
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate("/team/teams")}
          className="rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm p-4 cursor-pointer hover:border-primary/40 transition-all space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Teams</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {teamsLoading ? "..." : teams.length}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            Groups & departments
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate("/team/access")}
          className="rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm p-4 cursor-pointer hover:border-primary/40 transition-all space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Section Grants</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {staffLoading ? "..." : totalDirectGrants}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            Active section overrides
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate("/team/access?tab=presets")}
          className="rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm p-4 cursor-pointer hover:border-primary/40 transition-all space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Role Presets</span>
            <KeyRound className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {presets.length}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            Reusable RBAC templates
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate("/team/access?tab=designations")}
          className="rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm p-4 cursor-pointer hover:border-primary/40 transition-all space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Titles</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {designations.length}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            Corporate designations
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate("/team/audit-log")}
          className="rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm p-4 cursor-pointer hover:border-primary/40 transition-all space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Audit Log</span>
            <ClipboardList className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-display text-foreground">
            {auditData?.total ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            Security audit events
          </p>
        </motion.div>
      </div>

      {/* Main Grid: Teams & Departments vs Security Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Teams & Departments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Teams Overview Box */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Active Departments & Teams
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Teams grant automatic inherited section permissions to all assigned members.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/team/teams")}
                className="text-xs gap-1 h-8"
              >
                Manage all <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground rounded-lg border border-dashed border-border/60 bg-muted/10 p-6">
                <Building2 className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-sm font-medium text-foreground">No teams created yet</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">Group your staff into departments for seamless permission sharing.</p>
                <Button size="sm" onClick={() => navigate("/team/teams?action=create")} className="h-8 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create First Team
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/team/teams?selected=${t.id}`)}
                    className="group relative rounded-lg border border-border/70 bg-card hover:bg-muted/30 hover:border-primary/40 transition-all p-4 cursor-pointer overflow-hidden space-y-3"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: t.color }} />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {t.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {t.description || "No description provided"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                        {t.members.length} member{t.members.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                      <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary/80" />
                        <span>{t.sections.length} section grant{t.sections.length !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-[11px] text-primary group-hover:underline flex items-center gap-0.5">
                        Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Roles Breakdown */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3.5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Role Distribution Breakdown
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                <span className="text-[11px] font-medium text-amber-500">Master Admin</span>
                <p className="text-xl font-bold text-foreground">{roleCounts.master_admin}</p>
                <p className="text-[10px] text-muted-foreground">Unrestricted Founder Level</p>
              </div>
              <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3 space-y-1">
                <span className="text-[11px] font-medium text-indigo-500">Admins</span>
                <p className="text-xl font-bold text-foreground">{roleCounts.admin}</p>
                <p className="text-[10px] text-muted-foreground">Full Platform Access</p>
              </div>
              <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 space-y-1">
                <span className="text-[11px] font-medium text-purple-500">Managers & Mods</span>
                <p className="text-xl font-bold text-foreground">{roleCounts.manager + roleCounts.moderator}</p>
                <p className="text-[10px] text-muted-foreground">Operations Supervision</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-1">
                <span className="text-[11px] font-medium text-emerald-500">Support & Marketing</span>
                <p className="text-xl font-bold text-foreground">{roleCounts.support + roleCounts.marketing + roleCounts.maintainer}</p>
                <p className="text-[10px] text-muted-foreground">Section-Scoped Staff</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Security & Audit Trail Feed */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Recent Security Events</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/team/audit-log")}
                className="text-xs h-7 gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </Button>
            </div>

            {auditLoading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : (auditData?.items ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No recent security actions logged.
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {(auditData?.items ?? []).map((item: any) => (
                  <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-medium text-foreground truncate max-w-[140px]">
                        {item.actor_name || "System"}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                        {item.action}
                      </Badge>
                      {item.target_name && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          for <span className="text-foreground/90 font-medium">{item.target_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-xs">
            <p className="font-semibold text-primary flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> RBAC Security Protocol
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Master Admins hold complete control including delegating admin roles. Plain Admins manage products, orders, and standard permissions. Staff members only see the specific Control Panel sections granted directly or via their team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
