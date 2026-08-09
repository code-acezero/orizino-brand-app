"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Users2, ShieldCheck, Clock, UserCircle2 } from "lucide-react";

const SECTION_LABELS: Record<string, string> = {
  products: "Products", orders: "Orders", offline_orders: "Offline Orders",
  customers: "Customers", affiliate: "Affiliate Hub", seo: "SEO & Tracking",
  storefront_ui: "Storefront UI", portfolio: "Portfolio / CMS", ai: "AI",
  analytics: "Analytics", employees: "Employees", settings: "Settings",
};

const SECTION_COLORS: Record<string, string> = {
  products: "#a855f7", orders: "#f59e0b", offline_orders: "#f97316",
  customers: "#38bdf8", affiliate: "#84cc16", seo: "#fb923c",
  storefront_ui: "#ec4899", portfolio: "#22d3ee", ai: "#818cf8",
  analytics: "#34d399", employees: "#f43f5e", settings: "#94a3b8",
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const ACTION_LABELS: Record<string, string> = {
  team_created: "Team created",
  team_updated: "Team updated",
  member_added: "Member added",
  member_removed: "Member removed",
  section_granted: "Section access granted",
  section_revoked: "Section access revoked",
};

export default function AdminMyTeam() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-teams", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [myTeamsRes, membersRes, sectionsRes, profilesRes, auditRes] = await Promise.all([
        (supabase as any).from("team_members").select("team_id, added_at").eq("user_id", user!.id),
        (supabase as any).from("team_members").select("team_id, user_id, added_at"),
        (supabase as any).from("team_section_access").select("team_id, section"),
        supabase.from("profiles").select("id, full_name, avatar_url"),
        (supabase as any).from("team_audit_log").select("*").eq("target_user_id", user!.id).order("created_at", { ascending: false }).limit(20),
      ]);

      const myTeamIds = (myTeamsRes.data ?? []).map((r: any) => r.team_id);
      if (!myTeamIds.length) return { teams: [], auditLog: auditRes.data ?? [] };

      const teamsRes = await (supabase as any).from("teams").select("*").in("id", myTeamIds);
      const teams = (teamsRes.data ?? []).map((team: any) => {
        const teamMembers = (membersRes.data ?? [])
          .filter((m: any) => m.team_id === team.id)
          .map((m: any) => ({
            ...m,
            ...((profilesRes.data ?? []).find((p: any) => p.id === m.user_id) ?? {}),
          }));
        const teamSections = (sectionsRes.data ?? [])
          .filter((s: any) => s.team_id === team.id)
          .map((s: any) => s.section);
        const joinedAt = (myTeamsRes.data ?? []).find((r: any) => r.team_id === team.id)?.added_at;
        return { ...team, members: teamMembers, sections: teamSections, joinedAt };
      });

      return { teams, auditLog: auditRes.data ?? [] };
    },
  });

  const { teams = [], auditLog = [] } = data ?? {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 rounded-xl border border-border/40 bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <Users2 className="w-7 h-7" /> My Teams
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your team memberships, teammates, and assigned section access.
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Users2 className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">You haven't been added to any team yet.</p>
          <p className="text-xs text-muted-foreground">Ask your admin to assign you to a team.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team: any, i: number) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border/60 bg-card overflow-hidden"
            >
              {/* Color bar */}
              <div className="h-1.5" style={{ backgroundColor: team.color }} />

              <div className="p-6 space-y-5">
                {/* Team header */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base text-white shadow-sm shrink-0"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg">{team.name}</h2>
                    {team.description && (
                      <p className="text-sm text-muted-foreground">{team.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Joined {formatTime(team.joinedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-xs text-primary font-medium">
                    <ShieldCheck className="w-3 h-3" />
                    {team.sections.length} section{team.sections.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Section access */}
                {team.sections.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Section Access
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {team.sections.map((s: string) => {
                        const color = SECTION_COLORS[s] ?? "#94a3b8";
                        return (
                          <span
                            key={s}
                            className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
                          >
                            {SECTION_LABELS[s] ?? s}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Members */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Team Members ({team.members.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {team.members.map((m: any) => {
                      const isMe = m.user_id === user?.id;
                      return (
                        <div
                          key={m.user_id}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${isMe ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}
                        >
                          {m.avatar_url ? (
                            <img src={m.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                              {(m.full_name || "?")[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {m.full_name || m.user_id.slice(0, 8)}
                              {isMe && <span className="ml-1.5 text-[10px] text-primary font-normal">(you)</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Joined {formatTime(m.added_at)}
                            </p>
                          </div>
                          {isMe && <UserCircle2 className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Recent activity for this user */}
      {auditLog.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground mb-3">
            Recent Activity (you)
          </h2>
          <div className="space-y-1">
            {auditLog.map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/20 text-xs">
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-foreground font-medium">{ACTION_LABELS[log.action] ?? log.action}</span>
                {log.team_name && <span className="text-muted-foreground">in {log.team_name}</span>}
                {log.section_key && (
                  <span style={{ color: SECTION_COLORS[log.section_key] ?? "#94a3b8" }}>
                    {SECTION_LABELS[log.section_key] ?? log.section_key}
                  </span>
                )}
                <span className="ml-auto text-muted-foreground">{formatTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
// code:4ce0
