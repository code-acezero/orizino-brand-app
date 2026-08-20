"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/server-fn-compat";
import { listStaff } from "@/lib/staff.functions";
import {
  listTeamsDetailed,
  createTeam,
  updateTeam,
  deleteTeam,
  setTeamMembers,
  setTeamSections,
  TeamDetailed,
} from "@/lib/teams.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/app-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users2, Plus, Trash2, Settings2, UserPlus, X, ChevronRight,
  ShieldCheck, Edit3, Save, Clock, History, Filter, Search,
  Building2, BookOpen, Layers, Check, Loader2, Sparkles,
} from "lucide-react";

const SECTION_LABELS: Record<string, { label: string; color: string }> = {
  products:       { label: "Products",       color: "#a855f7" },
  orders:         { label: "Orders",         color: "#f59e0b" },
  offline_orders: { label: "Offline Orders", color: "#f97316" },
  customers:      { label: "Customers",      color: "#38bdf8" },
  affiliate:      { label: "Affiliate Hub",  color: "#84cc16" },
  seo:            { label: "Marketing",      color: "#fb923c" },
  storefront_ui:  { label: "Brand & Storefront", color: "#ec4899" },
  portfolio:      { label: "Portfolio / CMS", color: "#22d3ee" },
  ai:             { label: "AI Configuration", color: "#818cf8" },
  analytics:      { label: "Analytics",      color: "#34d399" },
  employees:      { label: "Team & Access",  color: "#f43f5e" },
  settings:       { label: "Settings & AI",  color: "#94a3b8" },
};

const ALL_SECTIONS = Object.keys(SECTION_LABELS);

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b",
  "#10b981", "#06b6d4", "#3b82f6", "#84cc16", "#14b8a6",
];

const DEPARTMENT_TEMPLATES = [
  { name: "Order Operations & Logistics", description: "Processes online and offline orders, invoices, and shipments.", color: "#f59e0b", sections: ["orders", "offline_orders", "customers"] },
  { name: "Product & Inventory", description: "Catalog management, categories, stock, and barcode serial printing.", color: "#a855f7", sections: ["products", "offline_orders"] },
  { name: "Customer Experience & Support", description: "Customer accounts, inquiries, orders, and support tickets.", color: "#38bdf8", sections: ["customers", "orders"] },
  { name: "Brand & Creative Design", description: "Storefront appearance, banners, lookbooks, and media assets.", color: "#ec4899", sections: ["storefront_ui", "portfolio"] },
  { name: "Marketing & Growth", description: "Campaigns, SEO, affiliate partners, coupons, and analytics.", color: "#fb923c", sections: ["seo", "affiliate", "analytics", "storefront_ui"] },
];

export default function AdminTeams() {
  const qc = useQueryClient();
  const fetchTeams = useServerFn(listTeamsDetailed);
  const fetchStaff = useServerFn(listStaff);
  const createTeamFn = useServerFn(createTeam);
  const updateTeamFn = useServerFn(updateTeam);
  const deleteTeamFn = useServerFn(deleteTeam);
  const setTeamMembersFn = useServerFn(setTeamMembers);
  const setTeamSectionsFn = useServerFn(setTeamSections);

  // Queries
  const { data: teams = [], isLoading: teamsLoading, refetch: refetchTeams } = useQuery({
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

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetchStaff(),
  });

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTeamModal, setEditTeamModal] = useState<TeamDetailed | null>(null);
  const [membersModalTeam, setMembersModalTeam] = useState<TeamDetailed | null>(null);
  const [sectionsModalTeam, setSectionsModalTeam] = useState<TeamDetailed | null>(null);

  // Form states
  const [teamForm, setTeamForm] = useState({
    name: "",
    description: "",
    color: PRESET_COLORS[0],
    initialSections: [] as string[],
  });

  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  // Mutations
  const createMut = useMutation({
    mutationFn: async () => {
      await createTeamFn({
        data: {
          name: teamForm.name.trim(),
          description: teamForm.description.trim() || null,
          color: teamForm.color,
          initialSections: teamForm.initialSections,
        },
      });
    },
    onSuccess: () => {
      toast.success("Team created successfully");
      setCreateModalOpen(false);
      setTeamForm({ name: "", description: "", color: PRESET_COLORS[0], initialSections: [] });
      qc.invalidateQueries({ queryKey: ["admin-teams-detailed"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create team"),
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editTeamModal) return;
      await updateTeamFn({
        data: {
          id: editTeamModal.id,
          name: teamForm.name.trim(),
          description: teamForm.description.trim() || null,
          color: teamForm.color,
        },
      });
    },
    onSuccess: () => {
      toast.success("Team updated");
      setEditTeamModal(null);
      qc.invalidateQueries({ queryKey: ["admin-teams-detailed"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update team"),
  });

  const deleteMut = useMutation({
    mutationFn: async (team: TeamDetailed) => {
      await deleteTeamFn({
        data: {
          id: team.id,
          name: team.name,
        },
      });
    },
    onSuccess: () => {
      toast.success("Team deleted");
      qc.invalidateQueries({ queryKey: ["admin-teams-detailed"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete team"),
  });

  const saveMembersMut = useMutation({
    mutationFn: async () => {
      if (!membersModalTeam) return;
      await setTeamMembersFn({
        data: {
          teamId: membersModalTeam.id,
          teamName: membersModalTeam.name,
          memberUserIds: Array.from(selectedMemberIds),
        },
      });
    },
    onSuccess: () => {
      toast.success("Team roster updated");
      setMembersModalTeam(null);
      qc.invalidateQueries({ queryKey: ["admin-teams-detailed"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update members"),
  });

  const saveSectionsMut = useMutation({
    mutationFn: async () => {
      if (!sectionsModalTeam) return;
      await setTeamSectionsFn({
        data: {
          teamId: sectionsModalTeam.id,
          teamName: sectionsModalTeam.name,
          sections: Array.from(selectedSections),
        },
      });
    },
    onSuccess: () => {
      toast.success("Team permissions updated");
      setSectionsModalTeam(null);
      qc.invalidateQueries({ queryKey: ["admin-teams-detailed"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update team permissions"),
  });

  const openEditModal = (t: TeamDetailed) => {
    setEditTeamModal(t);
    setTeamForm({
      name: t.name,
      description: t.description || "",
      color: t.color,
      initialSections: [],
    });
  };

  const openMembersModal = (t: TeamDetailed) => {
    setMembersModalTeam(t);
    setSelectedMemberIds(new Set(t.members.map((m) => m.user_id)));
    setMemberSearchQuery("");
  };

  const openSectionsModal = (t: TeamDetailed) => {
    setSectionsModalTeam(t);
    setSelectedSections(new Set(t.sections));
  };

  const applyDepartmentTemplate = (tpl: typeof DEPARTMENT_TEMPLATES[0]) => {
    setTeamForm({
      name: tpl.name,
      description: tpl.description,
      color: tpl.color,
      initialSections: tpl.sections,
    });
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-primary" /> Teams & Departments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Group employees into departments with shared section permissions and organizational structure.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setTeamForm({ name: "", description: "", color: PRESET_COLORS[0], initialSections: [] });
            setCreateModalOpen(true);
          }}
          className="gap-2 h-9 font-medium shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Department / Team
        </Button>
      </div>

      {/* Teams Grid */}
      {teamsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-xl border border-border/40 bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-border/80 bg-card p-8">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No Teams Configured</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Create departments like Sales, Warehouse, Support, or Marketing to easily distribute section permissions.
          </p>
          <Button size="sm" onClick={() => setCreateModalOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create First Team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              {/* Color Banner */}
              <div className="h-1.5 w-full" style={{ backgroundColor: team.color }} />

              <div className="p-5 space-y-4 flex-1">
                {/* Team Title & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base text-white shadow-sm shrink-0"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">{team.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {team.description || "No description provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(team)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete team "${team.name}"? Team members will not lose their accounts.`)) {
                          deleteMut.mutate(team);
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Members ({team.members.length})
                    </span>
                    <button
                      onClick={() => openMembersModal(team)}
                      className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Manage Roster
                    </button>
                  </div>

                  {team.members.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">No members assigned yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {team.members.map((m) => (
                        <div
                          key={m.user_id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 pl-1 pr-2.5 py-0.5 text-xs text-foreground border border-border/50"
                        >
                          {m.avatar_url ? (
                            <img
                              src={m.avatar_url}
                              alt={m.full_name || "member"}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                              {(m.full_name || "?")[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="max-w-[120px] truncate">{m.full_name || m.user_id.slice(0, 8)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Assigned Sections */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Shared Sections ({team.sections.length})
                    </span>
                    <button
                      onClick={() => openSectionsModal(team)}
                      className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                    >
                      <Settings2 className="w-3.5 h-3.5" /> Edit Access
                    </button>
                  </div>

                  {team.sections.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">No shared sections assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {team.sections.map((s) => {
                        const secInfo = SECTION_LABELS[s] || { label: s, color: "#6366f1" };
                        return (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded-md font-medium border"
                            style={{
                              backgroundColor: `${secInfo.color}15`,
                              color: secInfo.color,
                              borderColor: `${secInfo.color}35`,
                            }}
                          >
                            {secInfo.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Create Department / Team
            </DialogTitle>
            <DialogDescription>
              Create a group to grant team-wide section permissions automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Starter Templates */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Starter Department Templates
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEPARTMENT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => applyDepartmentTemplate(tpl)}
                    className="flex flex-col items-start p-2 rounded-lg border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 text-left transition-colors"
                  >
                    <span className="text-xs font-semibold text-foreground truncate w-full">{tpl.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate w-full mt-0.5">
                      {tpl.sections.length} sections included
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Team Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Department / Team Name *</label>
              <Input
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                placeholder="e.g. Order Fulfillment"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Textarea
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                placeholder="Department responsibilities and purpose"
                rows={2}
              />
            </div>

            {/* Color Theme */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Color Accent</label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTeamForm({ ...teamForm, color: c })}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      teamForm.color === c ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button
              disabled={!teamForm.name.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
              className="gap-1.5"
            >
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog open={!!editTeamModal} onOpenChange={(v) => !v && setEditTeamModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Team Name *</label>
              <Input
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Textarea
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Color</label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTeamForm({ ...teamForm, color: c })}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      teamForm.color === c ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTeamModal(null)}>Cancel</Button>
            <Button
              disabled={!teamForm.name.trim() || updateMut.isPending}
              onClick={() => updateMut.mutate()}
            >
              {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal */}
      <Dialog open={!!membersModalTeam} onOpenChange={(v) => !v && setMembersModalTeam(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Manage Members — {membersModalTeam?.name}
            </DialogTitle>
            <DialogDescription>
              Select which staff members belong to this department.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar */}
          <div className="relative pt-2">
            <Search className="w-4 h-4 absolute left-3 top-5 text-muted-foreground" />
            <Input
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder="Search staff to add or remove..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Staff checklist */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 py-2">
            {staff
              .filter((s: any) => {
                const needle = memberSearchQuery.trim().toLowerCase();
                return (
                  !needle ||
                  (s.full_name && s.full_name.toLowerCase().includes(needle)) ||
                  (s.email && s.email.toLowerCase().includes(needle)) ||
                  s.user_id.toLowerCase().includes(needle)
                );
              })
              .map((s: any) => {
                const isSelected = selectedMemberIds.has(s.user_id);

                return (
                  <label
                    key={s.user_id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                      isSelected ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          setSelectedMemberIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(s.user_id);
                            else next.delete(s.user_id);
                            return next;
                          });
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{s.full_name || "Staff"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{s.email || "No email"}</p>
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {s.roles.map((r: string) => (
                        <Badge key={r} variant="outline" className="text-[9px] py-0 px-1">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </label>
                );
              })}
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <div className="text-xs text-muted-foreground mr-auto self-center">
              {selectedMemberIds.size} selected
            </div>
            <Button variant="ghost" onClick={() => setMembersModalTeam(null)}>Cancel</Button>
            <Button
              disabled={saveMembersMut.isPending}
              onClick={() => saveMembersMut.mutate()}
            >
              {saveMembersMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Roster"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Sections Modal */}
      <Dialog open={!!sectionsModalTeam} onOpenChange={(v) => !v && setSectionsModalTeam(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Shared Section Grants — {sectionsModalTeam?.name}
            </DialogTitle>
            <DialogDescription>
              All members assigned to this team will inherit access to these sections.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 py-2">
            {ALL_SECTIONS.map((secKey) => {
              const secInfo = SECTION_LABELS[secKey];
              const isChecked = selectedSections.has(secKey);

              return (
                <label
                  key={secKey}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                    isChecked ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setSelectedSections((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(secKey);
                          else next.delete(secKey);
                          return next;
                        });
                      }}
                    />
                    <span className="font-semibold text-foreground">{secInfo.label}</span>
                  </div>

                  <code className="text-[10px] text-muted-foreground font-mono">{secKey}</code>
                </label>
              );
            })}
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <div className="text-xs text-muted-foreground mr-auto self-center">
              {selectedSections.size} sections selected
            </div>
            <Button variant="ghost" onClick={() => setSectionsModalTeam(null)}>Cancel</Button>
            <Button
              disabled={saveSectionsMut.isPending}
              onClick={() => saveSectionsMut.mutate()}
            >
              {saveSectionsMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
