"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users2, Plus, Trash2, Settings2, UserPlus, X, ChevronRight,
  ShieldCheck, Edit3, Save, Clock, History, Filter,
} from "lucide-react";
import { EmptyState } from "@/components/admin/TableStates";

const SECTION_LABELS: Record<string, { label: string; color: string }> = {
  products:       { label: "Products",       color: "#a855f7" },
  orders:         { label: "Orders",         color: "#f59e0b" },
  offline_orders: { label: "Offline Orders", color: "#f97316" },
  customers:      { label: "Customers",      color: "#38bdf8" },
  affiliate:      { label: "Affiliate Program", color: "#84cc16" },
  seo:            { label: "Marketing",      color: "#fb923c" },
  storefront_ui:  { label: "Brand & Storefront", color: "#ec4899" },
  portfolio:      { label: "Portfolio/CMS",  color: "#22d3ee" },
  ai:             { label: "AI",             color: "#818cf8" },
  analytics:      { label: "Analytics",      color: "#34d399" },
  employees:      { label: "Team & Access",  color: "#f43f5e" },
  settings:       { label: "Settings & AI",  color: "#94a3b8" },
};
const ALL_SECTIONS = Object.keys(SECTION_LABELS);

const TEAM_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f43f5e","#f59e0b",
  "#10b981","#06b6d4","#3b82f6","#84cc16","#14b8a6",
];

const ACTION_ICON: Record<string, { label: string; dot: string }> = {
  team_created:    { label: "Team created",          dot: "bg-primary" },
  team_updated:    { label: "Team updated",           dot: "bg-amber-400" },
  team_deleted:    { label: "Team deleted",           dot: "bg-destructive" },
  member_added:    { label: "Member added",           dot: "bg-emerald-400" },
  member_removed:  { label: "Member removed",         dot: "bg-rose-400" },
  section_granted: { label: "Section access granted", dot: "bg-sky-400" },
  section_revoked: { label: "Section access revoked", dot: "bg-orange-400" },
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TeamCard({ team, members, sections, onEdit, onDelete, onManageMembers, onManageSections }: {
  team: any; members: any[]; sections: string[];
  onEdit: () => void; onDelete: () => void;
  onManageMembers: () => void; onManageSections: () => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: team.color }} />
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-sm"
              style={{ backgroundColor: team.color }}>
              {team.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{team.name}</h3>
              {team.description && <p className="text-xs text-muted-foreground line-clamp-1">{team.description}</p>}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted/60 transition-colors">
              <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Members ({members.length})</span>
            <button onClick={onManageMembers} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <UserPlus className="w-3 h-3" /> Manage
            </button>
          </div>
          {members.length === 0
            ? <p className="text-xs text-muted-foreground italic">No members yet</p>
            : <div className="flex flex-wrap gap-1.5">
                {members.map((m: any) => (
                  <div key={m.user_id} className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2.5 py-0.5 text-xs">
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold">
                      {(m.full_name || "?")[0]?.toUpperCase()}
                    </div>
                    <span className="max-w-[100px] truncate">{m.full_name || m.user_id.slice(0, 8)}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sections ({sections.length})</span>
            <button onClick={onManageSections} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Settings2 className="w-3 h-3" /> Manage
            </button>
          </div>
          {sections.length === 0
            ? <p className="text-xs text-muted-foreground italic">No sections assigned</p>
            : <div className="flex flex-wrap gap-1.5">
                {sections.map((s) => {
                  const m = SECTION_LABELS[s] ?? { label: s, color: "#94a3b8" };
                  return (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${m.color}22`, color: m.color, border: `1px solid ${m.color}44` }}>
                      {m.label}
                    </span>
                  );
                })}
              </div>
          }
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminTeams() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"teams" | "audit">("teams");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTeam, setEditTeam]     = useState<any>(null);
  const [membersTeam, setMembersTeam] = useState<any>(null);
  const [sectionsTeam, setSectionsTeam] = useState<any>(null);
  const [form, setForm]             = useState({ name: "", description: "", color: TEAM_COLORS[0] });
  const [auditFilter, setAuditFilter] = useState<string>("all");

  // ── Data ──────────────────────────────────────────────────────
  const { data: teamsData, isLoading } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: async () => {
      const [teamsRes, membersRes, sectionsRes, profilesRes] = await Promise.all([
        (supabase as any).from("teams").select("*").order("created_at"),
        (supabase as any).from("team_members").select("team_id, user_id"),
        (supabase as any).from("team_section_access").select("team_id, section"),
        supabase.from("profiles").select("id, full_name, avatar_url"),
      ]);
      const profiles: Record<string, any> = {};
      (profilesRes.data ?? []).forEach((p) => (profiles[p.id] = p));
      return { teams: teamsRes.data ?? [], members: membersRes.data ?? [], sections: sectionsRes.data ?? [], profiles };
    },
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["team-audit-log", auditFilter],
    enabled: tab === "audit",
    queryFn: async () => {
      let q = (supabase as any).from("team_audit_log").select("*, profiles:performed_by(full_name), target:target_user_id(full_name)").order("created_at", { ascending: false }).limit(200);
      if (auditFilter !== "all") q = q.eq("action", auditFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: staffList } = useQuery({
    queryKey: ["staff-list-for-teams"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").limit(200);
      const ids = [...new Set((roles ?? []).map((r: any) => r.user_id))];
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      return (profs ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      }));
    },
  });

  const { teams = [], members = [], sections = [], profiles = {} } = teamsData ?? {};
  const teamMembers  = (id: string) => members.filter((m: any) => m.team_id === id).map((m: any) => ({ ...m, ...(profiles[m.user_id] ?? {}) }));
  const teamSections = (id: string) => sections.filter((s: any) => s.team_id === id).map((s: any) => s.section);

  // ── Mutations ─────────────────────────────────────────────────
  const inv = () => { qc.invalidateQueries({ queryKey: ["admin-teams"] }); qc.invalidateQueries({ queryKey: ["teams-summary"] }); qc.invalidateQueries({ queryKey: ["team-audit-log"] }); };

  const createMut = useMutation({
    mutationFn: async (d: any) => { const { error } = await (supabase as any).from("teams").insert({ ...d, created_by: user?.id }); if (error) throw error; },
    onSuccess: () => { toast.success("Team created"); inv(); setCreateOpen(false); setForm({ name: "", description: "", color: TEAM_COLORS[0] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: async ({ id, data }: any) => { const { error } = await (supabase as any).from("teams").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Team updated"); inv(); setEditTeam(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("teams").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Team deleted"); inv(); },
    onError: (e: any) => toast.error(e.message),
  });
  const addMemberMut = useMutation({
    mutationFn: async ({ teamId, userId }: any) => {
      const { error } = await (supabase as any).from("team_members").insert({ team_id: teamId, user_id: userId, added_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Member added"); inv(); },
    onError: (e: any) => toast.error(e.message),
  });
  const removeMemberMut = useMutation({
    mutationFn: async ({ teamId, userId }: any) => { const { error } = await (supabase as any).from("team_members").delete().eq("team_id", teamId).eq("user_id", userId); if (error) throw error; },
    onSuccess: () => { toast.success("Member removed"); inv(); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleSectionMut = useMutation({
    mutationFn: async ({ teamId, section, has }: any) => {
      if (has) {
        const { error } = await (supabase as any).from("team_section_access").delete().eq("team_id", teamId).eq("section", section);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("team_section_access").insert({ team_id: teamId, section, granted_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-teams"] }); qc.invalidateQueries({ queryKey: ["staff-sections"] }); qc.invalidateQueries({ queryKey: ["team-audit-log"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Users2 className="w-7 h-7" /> Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">Create teams, assign staff, and control section access. Triggers auto-log every change.</p>
        </div>
        <Button onClick={() => { setForm({ name: "", description: "", color: TEAM_COLORS[0] }); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> New Team
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60">
        {(["teams", "audit"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "audit" ? <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Audit Log</span> : "Teams"}
          </button>
        ))}
      </div>

      {/* ── Teams tab ── */}
      {tab === "teams" && (
        <>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground flex gap-3 items-start">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span><span className="font-medium text-foreground">How it works:</span> Members inherit section access from their team. 1 section → redirected straight there. Multiple → sees panel with their sections only. All changes are auto-logged.</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1,2,3].map((i) => <div key={i} className="h-48 rounded-xl border border-border/40 bg-muted/20 animate-pulse" />)}
            </div>
          ) : teams.length === 0 ? (
            <EmptyState
              icon={<Users2 className="w-5 h-5" />}
              message="No teams yet"
              hint="Group members into teams to control which sections they can access."
              action={<Button variant="outline" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Create team</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {teams.map((team: any) => (
                  <TeamCard key={team.id} team={team}
                    members={teamMembers(team.id)} sections={teamSections(team.id)}
                    onEdit={() => { setEditTeam(team); setForm({ name: team.name, description: team.description ?? "", color: team.color }); }}
                    onDelete={() => { if (confirm(`Delete team "${team.name}"?`)) deleteMut.mutate(team.id); }}
                    onManageMembers={() => setMembersTeam(team)}
                    onManageSections={() => setSectionsTeam(team)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* ── Audit Log tab ── */}
      {tab === "audit" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {["all", "member_added", "member_removed", "section_granted", "section_revoked", "team_created", "team_updated"].map((f) => (
              <button key={f} onClick={() => setAuditFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${auditFilter === f ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
                {f === "all" ? "All" : ACTION_ICON[f]?.label ?? f}
              </button>
            ))}
          </div>

          {auditLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-10 rounded-lg bg-muted/20 animate-pulse" />)}</div>
          ) : (auditData ?? []).length === 0 ? (
            <EmptyState
              icon={<History className="w-5 h-5" />}
              message="No audit events yet"
              hint="Changes to teams are automatically logged here."
            />
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">Team</th>
                    <th className="px-3 py-2 text-left">Detail</th>
                    <th className="px-3 py-2 text-left">Performed by</th>
                    <th className="px-3 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditData ?? []).map((log: any) => {
                    const cfg = ACTION_ICON[log.action] ?? { label: log.action, dot: "bg-muted" };
                    return (
                      <tr key={log.id} className="border-t border-border/30 hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                            <span className="font-medium">{cfg.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{log.team_name ?? "—"}</td>
                        <td className="px-3 py-2">
                          {log.target?.full_name && <span className="text-foreground">{log.target.full_name}</span>}
                          {log.section_key && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ backgroundColor: `${SECTION_LABELS[log.section_key]?.color ?? "#94a3b8"}22`, color: SECTION_LABELS[log.section_key]?.color ?? "#94a3b8" }}>
                              {SECTION_LABELS[log.section_key]?.label ?? log.section_key}
                            </span>
                          )}
                          {!log.target?.full_name && !log.section_key && <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{log.profiles?.full_name ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(log.created_at)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={createOpen || !!editTeam} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditTeam(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTeam ? "Edit Team" : "Create Team"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground">Team name *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Catalog Team" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {TEAM_COLORS.map((c) => (
                  <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{ backgroundColor: c, outline: form.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setEditTeam(null); }}>Cancel</Button>
            <Button disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}
              onClick={() => editTeam ? updateMut.mutate({ id: editTeam.id, data: form }) : createMut.mutate(form)}>
              <Save className="w-4 h-4 mr-1.5" />{editTeam ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Members Dialog ── */}
      <Dialog open={!!membersTeam} onOpenChange={(o) => { if (!o) setMembersTeam(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Members — {membersTeam?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {membersTeam && teamMembers(membersTeam.id).length === 0 && (
                <p className="text-xs text-muted-foreground py-3 text-center">No members yet</p>
              )}
              {membersTeam && teamMembers(membersTeam.id).map((m: any) => (
                <div key={m.user_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                      {(m.full_name || "?")[0]?.toUpperCase()}
                    </div>
                    <p className="text-sm font-medium">{m.full_name || m.user_id.slice(0, 8)}</p>
                  </div>
                  <button onClick={() => removeMemberMut.mutate({ teamId: membersTeam.id, userId: m.user_id })}
                    className="p-1.5 rounded-md hover:bg-destructive/10">
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Add from staff</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(staffList ?? [])
                  .filter((s: any) => membersTeam && !teamMembers(membersTeam.id).some((m: any) => m.user_id === s.id))
                  .map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                          {(s.full_name || "?")[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{s.full_name || s.id.slice(0, 8)}</p>
                          <div className="flex gap-1">{s.roles.map((r: string) => <span key={r} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{r}</span>)}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" disabled={addMemberMut.isPending}
                        onClick={() => addMemberMut.mutate({ teamId: membersTeam.id, userId: s.id })}>
                        <UserPlus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                {(staffList ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No staff yet. Add via Employees page first.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setMembersTeam(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sections Dialog ── */}
      <Dialog open={!!sectionsTeam} onOpenChange={(o) => { if (!o) setSectionsTeam(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Section Access — {sectionsTeam?.name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">Toggle sections. Members with 1 section are redirected there on login.</p>
          <div className="grid grid-cols-1 gap-1.5 py-2 max-h-80 overflow-y-auto">
            {ALL_SECTIONS.map((skey) => {
              const meta = SECTION_LABELS[skey];
              const has = sectionsTeam ? teamSections(sectionsTeam.id).includes(skey) : false;
              return (
                <button key={skey} disabled={toggleSectionMut.isPending}
                  onClick={() => toggleSectionMut.mutate({ teamId: sectionsTeam.id, section: skey, has })}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${has ? "border-primary/40 bg-primary/10" : "border-border/50 bg-muted/20 hover:bg-muted/40"}`}>
                  <span className="text-sm font-medium">{meta.label}</span>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${has ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                    {has && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setSectionsTeam(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

}
// code:4ce0
