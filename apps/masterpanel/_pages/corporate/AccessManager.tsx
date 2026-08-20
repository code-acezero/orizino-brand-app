"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  listStaff,
  listAuditLog,
  bulkGrantSections,
  bulkRevokeSections,
  cloneRolePreset,
  StaffMemberDetail,
} from "@/lib/staff.functions";
import {
  listDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from "@/lib/designations.functions";
import { listTeamsDetailed } from "@/lib/teams.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/app-toast";
import { formatDistanceToNow, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, LayoutGrid, Users2, Plus, Trash2, Save,
  Loader2, Search, X, Edit3, CheckCircle2, Shield,
  Layers, Package, ShoppingCart, Users, Briefcase, Palette,
  Globe, Bot, BarChart3, Settings2, Info, Copy, Filter,
  History, ArrowUpRight, Check, ChevronDown, Lock, Unlock,
  FileText, Building2, KeyRound, CheckCheck
} from "lucide-react";

interface StaffSection {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
}

interface Preset {
  id: string;
  name: string;
  description: string | null;
  sections: string[];
  is_system: boolean;
}

/* Section Module Categorization */
const SECTION_MODULES: { id: string; name: string; keys: string[] }[] = [
  {
    id: "commerce",
    name: "Commerce & Operations",
    keys: ["products", "orders", "offline_orders", "customers"],
  },
  {
    id: "growth",
    name: "Growth & Marketing",
    keys: ["affiliate", "seo", "analytics"],
  },
  {
    id: "brand",
    name: "Brand & Content",
    keys: ["storefront_ui", "portfolio"],
  },
  {
    id: "security",
    name: "Security & System",
    keys: ["ai", "employees", "settings"],
  },
];

/* ────────────────────────────────────────────────────────────── */
/* Tab 1 — RBAC Permissions Matrix Grid                           */
/* ────────────────────────────────────────────────────────────── */
function MatrixTab({
  staff,
  sections,
  presets,
  teams,
}: {
  staff: StaffMemberDetail[];
  sections: StaffSection[];
  presets: Preset[];
  teams: any[];
}) {
  const qc = useQueryClient();
  const bulkGrantFn = useServerFn(bulkGrantSections);
  const bulkRevokeFn = useServerFn(bulkRevokeSections);

  const [q, setQ] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Bulk action section modal state
  const [bulkGrantSectionModal, setBulkGrantSectionModal] = useState(false);
  const [bulkRevokeSectionModal, setBulkRevokeSectionModal] = useState(false);
  const [selectedSectionsForBulk, setSelectedSectionsForBulk] = useState<Set<string>>(new Set());

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const needle = q.trim().toLowerCase();
      const matchQuery =
        !needle ||
        (s.full_name && s.full_name.toLowerCase().includes(needle)) ||
        (s.email && s.email.toLowerCase().includes(needle)) ||
        (s.designation_title && s.designation_title.toLowerCase().includes(needle)) ||
        s.user_id.toLowerCase().includes(needle);

      const matchTeam =
        selectedTeam === "all" || s.teams.some((t) => t.id === selectedTeam);

      const matchRole =
        selectedRole === "all" || s.roles.includes(selectedRole as any);

      return matchQuery && matchTeam && matchRole;
    });
  }, [staff, q, selectedTeam, selectedRole]);

  // Toggle single section grant
  const toggleSectionMut = useMutation({
    mutationFn: async ({ userId, section, enable }: { userId: string; section: string; enable: boolean }) => {
      if (enable) {
        const { error } = await supabase
          .from("staff_section_access")
          .upsert({ user_id: userId, section }, { onConflict: "user_id,section" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("staff_section_access")
          .delete()
          .eq("user_id", userId)
          .eq("section", section);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to toggle section"),
  });

  // Bulk apply preset to selected staff
  const bulkApplyPresetMut = useMutation({
    mutationFn: async (preset: Preset) => {
      if (selectedUserIds.size === 0) throw new Error("Select at least one staff member.");
      const users = Array.from(selectedUserIds);

      // Wipe existing direct grants for selected users
      const { error: delErr } = await supabase
        .from("staff_section_access")
        .delete()
        .in("user_id", users);
      if (delErr) throw delErr;

      if (preset.sections.length > 0) {
        const rows = users.flatMap((uid) =>
          preset.sections.map((section) => ({
            user_id: uid,
            section,
            preset_id: preset.id,
          }))
        );
        const { error: insErr } = await supabase.from("staff_section_access").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_d, preset) => {
      toast.success(`Applied preset "${preset.name}" to ${selectedUserIds.size} staff member(s)`);
      qc.invalidateQueries({ queryKey: ["staff"] });
      setSelectedUserIds(new Set());
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to apply preset"),
  });

  // Bulk Grant Mut
  const bulkGrantMut = useMutation({
    mutationFn: async () => {
      if (selectedUserIds.size === 0 || selectedSectionsForBulk.size === 0) return;
      await bulkGrantFn({
        data: {
          userIds: Array.from(selectedUserIds),
          sections: Array.from(selectedSectionsForBulk),
        },
      });
    },
    onSuccess: () => {
      toast.success(`Granted section(s) to ${selectedUserIds.size} staff member(s)`);
      qc.invalidateQueries({ queryKey: ["staff"] });
      setBulkGrantSectionModal(false);
      setSelectedSectionsForBulk(new Set());
      setSelectedUserIds(new Set());
    },
    onError: (e: any) => toast.error(e?.message ?? "Bulk grant failed"),
  });

  // Bulk Revoke Mut
  const bulkRevokeMut = useMutation({
    mutationFn: async () => {
      if (selectedUserIds.size === 0 || selectedSectionsForBulk.size === 0) return;
      await bulkRevokeFn({
        data: {
          userIds: Array.from(selectedUserIds),
          sections: Array.from(selectedSectionsForBulk),
        },
      });
    },
    onSuccess: () => {
      toast.success(`Revoked section(s) from ${selectedUserIds.size} staff member(s)`);
      qc.invalidateQueries({ queryKey: ["staff"] });
      setBulkRevokeSectionModal(false);
      setSelectedSectionsForBulk(new Set());
      setSelectedUserIds(new Set());
    },
    onError: (e: any) => toast.error(e?.message ?? "Bulk revoke failed"),
  });

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredStaff.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredStaff.map((s) => s.user_id)));
    }
  };

  const toggleSelectUser = (uid: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  return (
    <div className="space-y-4 w-full">
      {/* Toolbar & Filters (Mobile Responsive) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/70 p-3 sm:p-4 rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search staff, designation, or email..."
              className="pl-8.5 h-8.5 text-xs rounded-lg"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="h-8.5 px-2.5 rounded-lg border border-border bg-card text-xs text-foreground"
          >
            <option value="all">All Departments</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-8.5 px-2.5 rounded-lg border border-border bg-card text-xs text-foreground"
          >
            <option value="all">All Roles</option>
            <option value="master_admin">Master Admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="moderator">Moderator</option>
            <option value="support">Support</option>
            <option value="marketing">Marketing</option>
            <option value="maintainer">Maintainer</option>
          </select>
        </div>

        {/* Bulk Selection Actions */}
        {selectedUserIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
            <span className="text-xs font-semibold text-primary px-1">
              {selectedUserIds.size} Selected
            </span>

            {/* Presets Quick Apply Menu */}
            <div className="relative group">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-lg">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" /> Apply Preset <ChevronDown className="w-3 h-3" />
              </Button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-30 bg-popover border border-border rounded-xl shadow-lg p-1.5 min-w-[200px] space-y-1">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => bulkApplyPresetMut.mutate(preset)}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors flex flex-col"
                  >
                    <span className="font-semibold text-foreground">{preset.name}</span>
                    <span className="text-[10px] text-muted-foreground">{preset.sections.length} modules</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkGrantSectionModal(true)}
              className="h-8 text-xs gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
            >
              <Unlock className="w-3 h-3" /> Grant Access
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkRevokeSectionModal(true)}
              className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10 rounded-lg"
            >
              <Lock className="w-3 h-3" /> Revoke Access
            </Button>
          </div>
        )}
      </div>

      {/* Permissions Matrix Table (Fully Mobile Scrollable & Sticky) */}
      <div className="rounded-xl border border-border/80 bg-card overflow-x-auto shadow-xs">
        <table className="w-full text-xs text-left border-collapse min-w-[760px]">
          <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px]">
            {/* Category Header Row */}
            <tr className="border-b border-border/40">
              <th className="sticky left-0 bg-muted/95 backdrop-blur-sm z-20 px-3 py-2 text-left border-r border-border min-w-[200px] sm:min-w-[240px]">
                <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-foreground">
                  <Checkbox
                    checked={filteredStaff.length > 0 && selectedUserIds.size === filteredStaff.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span>Staff Member ({filteredStaff.length})</span>
                </label>
              </th>
              {SECTION_MODULES.map((mod) => {
                const moduleSections = sections.filter((s) => mod.keys.includes(s.key));
                if (moduleSections.length === 0) return null;
                return (
                  <th
                    key={mod.id}
                    colSpan={moduleSections.length}
                    className="px-3 py-1.5 text-center font-bold border-r border-border/30 last:border-r-0"
                  >
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] bg-secondary text-foreground font-semibold border border-border/60">
                      {mod.name}
                    </span>
                  </th>
                );
              })}
            </tr>

            {/* Individual Section Header Row */}
            <tr className="border-b border-border/60">
              <th className="sticky left-0 bg-muted/95 backdrop-blur-sm z-20 px-3 py-2 border-r border-border">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Role & Access Level</span>
              </th>
              {sections.map((sec) => (
                <th key={sec.key} className="px-2.5 py-2 text-center font-semibold whitespace-nowrap min-w-[95px] border-r border-border/30 last:border-r-0">
                  <div className="flex flex-col items-center gap-0.5" title={sec.description || sec.label}>
                    <span className="text-foreground font-bold">{sec.label}</span>
                    <code className="text-[9px] text-muted-foreground/80 font-mono font-normal">{sec.key}</code>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filteredStaff.map((member) => {
              const isAdmin = member.roles.includes("admin") || member.roles.includes("master_admin");
              const isSelected = selectedUserIds.has(member.user_id);
              const directSet = new Set(member.direct_sections || []);
              const teamSet = new Set(member.team_sections || []);

              return (
                <tr
                  key={member.user_id}
                  className={`hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                >
                  {/* Sticky Member Column */}
                  <td className="sticky left-0 bg-card/95 hover:bg-muted/40 backdrop-blur-sm z-10 px-3 py-2.5 border-r border-border">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectUser(member.user_id)}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate flex items-center gap-1.5 text-xs">
                          {member.full_name || member.email || member.user_id.slice(0, 8)}
                          {isAdmin && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Shield className="w-2.5 h-2.5 mr-0.5" /> admin
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <span>{member.designation_title || member.email}</span>
                          {member.teams.length > 0 && (
                            <span className="inline-flex gap-1">
                              {member.teams.map((t) => (
                                <span
                                  key={t.id}
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{ backgroundColor: t.color }}
                                  title={t.name}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  </td>

                  {/* Section Access Cells */}
                  {sections.map((sec) => {
                    const isDirect = directSet.has(sec.key);
                    const isTeamInherited = teamSet.has(sec.key);
                    const isChecked = isAdmin || isDirect || isTeamInherited;

                    return (
                      <td key={sec.key} className="text-center px-2 py-2 border-r border-border/20 last:border-r-0">
                        {isAdmin ? (
                          <div className="flex items-center justify-center" title="Admin Full Platform Access">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        ) : isTeamInherited && !isDirect ? (
                          <div className="flex items-center justify-center" title="Inherited from Department Team">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              <Users className="w-3 h-3" />
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(v) =>
                                toggleSectionMut.mutate({
                                  userId: member.user_id,
                                  section: sec.key,
                                  enable: !!v,
                                })
                              }
                              className="w-4 h-4 rounded-md"
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan={sections.length + 1} className="py-12 text-center text-muted-foreground">
                  No staff members match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend & Guide (Mobile Responsive) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground p-3 rounded-xl border border-border/60 bg-card">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <Checkbox checked disabled className="opacity-100 rounded-md" />
            <span>Direct Section Grant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-flex items-center justify-center text-xs">
              <Users className="w-3 h-3" />
            </span>
            <span>Inherited via Department Team</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center justify-center text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <span>Admin Global Access (All Unlocked)</span>
          </div>
        </div>

        <span className="text-[11px] text-muted-foreground">
          Tip: Select staff members using checkboxes to apply role presets or bulk grant/revoke access.
        </span>
      </div>

      {/* Bulk Grant Modal */}
      <Dialog open={bulkGrantSectionModal} onOpenChange={setBulkGrantSectionModal}>
        <DialogContent className="max-w-md w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Unlock className="w-5 h-5 text-emerald-500" /> Bulk Grant Section Permissions
            </DialogTitle>
            <DialogDescription>
              Grant selected section permissions to {selectedUserIds.size} selected staff member(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-xs font-semibold text-muted-foreground">Select Sections to Grant:</p>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {sections.map((s) => {
                const isSelected = selectedSectionsForBulk.has(s.key);
                return (
                  <label
                    key={s.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                      isSelected ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-muted/20"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        setSelectedSectionsForBulk((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.key)) next.delete(s.key);
                          else next.add(s.key);
                          return next;
                        });
                      }}
                    />
                    <span className="truncate font-medium">{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setBulkGrantSectionModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => bulkGrantMut.mutate()}
              disabled={bulkGrantMut.isPending || selectedSectionsForBulk.size === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {bulkGrantMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Grant Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Revoke Modal */}
      <Dialog open={bulkRevokeSectionModal} onOpenChange={setBulkRevokeSectionModal}>
        <DialogContent className="max-w-md w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Lock className="w-5 h-5 text-rose-500" /> Bulk Revoke Section Permissions
            </DialogTitle>
            <DialogDescription>
              Revoke selected section permissions from {selectedUserIds.size} selected staff member(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-xs font-semibold text-muted-foreground">Select Sections to Revoke:</p>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {sections.map((s) => {
                const isSelected = selectedSectionsForBulk.has(s.key);
                return (
                  <label
                    key={s.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                      isSelected ? "border-rose-500/50 bg-rose-500/10" : "border-border bg-muted/20"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        setSelectedSectionsForBulk((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.key)) next.delete(s.key);
                          else next.add(s.key);
                          return next;
                        });
                      }}
                    />
                    <span className="truncate font-medium">{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setBulkRevokeSectionModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => bulkRevokeMut.mutate()}
              disabled={bulkRevokeMut.isPending || selectedSectionsForBulk.size === 0}
            >
              {bulkRevokeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Revoke Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Tab 2 — Role Presets Manager                                   */
/* ────────────────────────────────────────────────────────────── */
function PresetsTab({
  sections,
  presets,
  staff,
}: {
  sections: StaffSection[];
  presets: Preset[];
  staff: StaffMemberDetail[];
}) {
  const qc = useQueryClient();
  const clonePresetFn = useServerFn(cloneRolePreset);

  const [editing, setEditing] = useState<Preset | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  const startEdit = (p: Preset | null) => {
    if (p) {
      setEditing(p);
      setName(p.name);
      setDescription(p.description || "");
      setSelectedSections(new Set(p.sections));
    } else {
      setEditing(null);
      setName("");
      setDescription("");
      setSelectedSections(new Set());
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Preset name is required");
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        sections: Array.from(selectedSections),
      };

      if (editing) {
        const { error } = await supabase.from("staff_role_presets").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("staff_role_presets").insert({ ...payload, is_system: false });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Preset updated" : "Preset created");
      qc.invalidateQueries({ queryKey: ["staff-presets"] });
      startEdit(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save preset"),
  });

  const cloneMut = useMutation({
    mutationFn: async (presetId: string) => {
      const orig = presets.find((p) => p.id === presetId);
      const newName = `${orig?.name ?? "Preset"} (Copy)`;
      await clonePresetFn({ data: { presetId, newName } });
    },
    onSuccess: () => {
      toast.success("Role preset cloned successfully");
      qc.invalidateQueries({ queryKey: ["staff-presets"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to clone preset"),
  });

  const deleteMut = useMutation({
    mutationFn: async (p: Preset) => {
      const { error } = await supabase.from("staff_role_presets").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preset deleted");
      qc.invalidateQueries({ queryKey: ["staff-presets"] });
      if (editing) startEdit(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete preset"),
  });

  const toggleSection = (secKey: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(secKey)) next.delete(secKey);
      else next.add(secKey);
      return next;
    });
  };

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-12 w-full">
      {/* Preset Cards List */}
      <div className="md:col-span-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" /> Role Presets ({presets.length})
            </h3>
            <p className="text-xs text-muted-foreground">Reusable permission bundles for rapid onboarding</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => startEdit(null)} className="h-8 text-xs gap-1 rounded-lg">
            <Plus className="w-3.5 h-3.5" /> New Preset
          </Button>
        </div>

        <div className="space-y-2.5">
          {presets.map((p) => {
            const isSelected = editing?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => startEdit(p)}
                className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary/60 bg-primary/5 shadow-xs"
                    : "border-border/70 bg-card hover:bg-muted/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      {p.name}
                      {p.is_system ? (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-muted/40 font-normal border-border">
                          system bundle
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-primary/10 text-primary border-primary/30">
                          custom
                        </Badge>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      {p.sections.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] rounded-md bg-secondary text-foreground px-1.5 py-0.5 font-medium border border-border/40"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => cloneMut.mutate(p.id)}
                      disabled={cloneMut.isPending}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Clone preset"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {!p.is_system && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete preset "${p.name}"?`)) deleteMut.mutate(p);
                        }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor Box */}
      <div className="md:col-span-7 rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              {editing ? `Edit Preset: ${editing.name}` : "Create New Role Preset"}
            </h3>
            <p className="text-xs text-muted-foreground">Select section modules bundled into this preset</p>
          </div>
          {editing && (
            <Button size="sm" variant="ghost" onClick={() => startEdit(null)} className="h-7 text-xs">
              Cancel
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Preset Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Operations Executive"
              className="text-xs h-8.5 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Full order processing and inventory control access"
              className="text-xs h-8.5 rounded-lg"
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Included Section Permissions ({selectedSections.size}/{sections.length})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {sections.map((s) => {
                const isSelected = selectedSections.has(s.key);
                return (
                  <label
                    key={s.key}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                      isSelected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60 bg-muted/10 hover:bg-muted/30"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-foreground truncate">{s.label}</p>
                      {s.description && (
                        <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
                      )}
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSection(s.key)}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !name.trim()}
              className="gap-1.5 text-xs font-medium rounded-lg px-4"
            >
              {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {editing ? "Update Preset" : "Save Preset"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Tab 3 — Corporate Designations & Titles                        */
/* ────────────────────────────────────────────────────────────── */
function DesignationsTab() {
  const qc = useQueryClient();
  const fetchDesignationsFn = useServerFn(listDesignations);
  const createDesignationFn = useServerFn(createDesignation);
  const updateDesignationFn = useServerFn(updateDesignation);
  const deleteDesignationFn = useServerFn(deleteDesignation);

  const [search, setSearch] = useState("");
  const [editingDes, setEditingDes] = useState<{ id: string; title: string; description?: string | null } | null>(null);
  const [desTitle, setDesTitle] = useState("");
  const [desDescription, setDesDescription] = useState("");

  const { data: designations = [], isLoading } = useQuery({
    queryKey: ["designations-list"],
    queryFn: () => fetchDesignationsFn(),
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return designations;
    return designations.filter(
      (d: any) =>
        d.title.toLowerCase().includes(needle) ||
        (d.description && d.description.toLowerCase().includes(needle))
    );
  }, [designations, search]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!desTitle.trim()) throw new Error("Title is required");
      if (editingDes) {
        await updateDesignationFn({
          data: {
            id: editingDes.id,
            title: desTitle.trim(),
            description: desDescription.trim() || undefined,
          },
        });
      } else {
        await createDesignationFn({
          data: {
            title: desTitle.trim(),
            description: desDescription.trim() || undefined,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(editingDes ? "Designation updated" : "Designation created");
      qc.invalidateQueries({ queryKey: ["designations-list"] });
      setEditingDes(null);
      setDesTitle("");
      setDesDescription("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save designation"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await deleteDesignationFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Designation deleted");
      qc.invalidateQueries({ queryKey: ["designations-list"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const startEdit = (d: any) => {
    setEditingDes(d);
    setDesTitle(d.title);
    setDesDescription(d.description || "");
  };

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-12 w-full">
      {/* Designations Roster */}
      <div className="md:col-span-7 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-primary" /> Corporate Job Titles ({designations.length})
            </h3>
            <p className="text-xs text-muted-foreground">Standardized designations for badges and permissions</p>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles..."
              className="pl-8.5 h-8 text-xs rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((d: any) => (
            <div
              key={d.id}
              className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-all"
            >
              <div className="min-w-0 pr-3">
                <p className="text-xs font-semibold text-foreground truncate">{d.title}</p>
                {d.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{d.description}</p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit(d)}
                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete designation "${d.title}"?`)) deleteMut.mutate(d.id);
                  }}
                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !isLoading && (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No matching designations found.
            </div>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="md:col-span-5 rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3.5 shadow-xs h-fit">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-primary" />
          {editingDes ? `Edit Title: ${editingDes.title}` : "New Corporate Title"}
        </h4>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Title / Designation Name *</label>
          <Input
            value={desTitle}
            onChange={(e) => setDesTitle(e.target.value)}
            placeholder="e.g. Chief Marketing Officer (CMO)"
            className="text-xs h-8.5 rounded-lg"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Description & Scope</label>
          <Textarea
            value={desDescription}
            onChange={(e) => setDesDescription(e.target.value)}
            placeholder="Executive overview or department scope..."
            rows={3}
            className="text-xs rounded-lg resize-none"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
          {editingDes && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingDes(null);
                setDesTitle("");
                setDesDescription("");
              }}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !desTitle.trim()}
            className="h-8 text-xs font-medium gap-1.5 rounded-lg"
          >
            {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {editingDes ? "Update Title" : "Create Title"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Tab 4 — Real-time Security Audit Log                          */
/* ────────────────────────────────────────────────────────────── */
function AuditTab() {
  const fetchAudit = useServerFn(listAuditLog);
  const [filterAction, setFilterAction] = useState("all");

  const { data: auditData, isLoading } = useQuery({
    queryKey: ["staff-audit-log-tab", filterAction],
    queryFn: () => fetchAudit({ data: { limit: 100, action: filterAction } }),
  });

  const items = auditData?.items ?? [];

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-primary" /> Security & Access Audit Log
          </h3>
          <p className="text-xs text-muted-foreground">Immutable trail of permission grants, role updates, and preset applications</p>
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="h-8.5 px-3 rounded-lg border border-border bg-card text-xs text-foreground"
        >
          <option value="all">All Audit Actions</option>
          <option value="update_section_access">Section Access Updates</option>
          <option value="bulk_grant_sections">Bulk Grants</option>
          <option value="bulk_revoke_sections">Bulk Revokes</option>
          <option value="grant_role">Role Grants</option>
          <option value="revoke_role">Role Revokes</option>
          <option value="assign_designation">Designation Changes</option>
          <option value="clone_preset">Preset Clones</option>
        </select>
      </div>

      <div className="rounded-xl border border-border/80 bg-card overflow-x-auto shadow-xs">
        <table className="w-full text-xs text-left min-w-[680px]">
          <thead className="bg-muted/40 uppercase text-[10px] text-muted-foreground font-semibold">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target / Entity</th>
              <th className="px-4 py-3">Details / Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading audit trail...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  No security audit logs found for this filter.
                </td>
              </tr>
            ) : (
              items.map((row: any) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                    {row.created_at ? format(new Date(row.created_at), "MMM dd, yyyy HH:mm:ss") : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                    {row.actor_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold bg-primary/10 text-primary border-primary/20">
                      {row.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">
                    {row.target_name || row.entity_id || "System"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[10px] max-w-xs truncate">
                    {row.meta ? JSON.stringify(row.meta) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Main AccessManager Dashboard Component                        */
/* ────────────────────────────────────────────────────────────── */
export default function AccessManager() {
  const fetchStaff = useServerFn(listStaff);
  const fetchTeams = useServerFn(listTeamsDetailed);

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetchStaff(),
  });

  const { data: teams = [] } = useQuery({
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

  const { data: sections = [] } = useQuery<StaffSection[]>({
    queryKey: ["staff-sections-list"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_sections").select("*").order("sort_order");
      return (data ?? []) as StaffSection[];
    },
  });

  const { data: presets = [] } = useQuery<Preset[]>({
    queryKey: ["staff-presets"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_role_presets").select("*").order("name");
      return (data ?? []) as Preset[];
    },
  });

  // Calculate high-level stats
  const totalStaff = staff.length;
  const adminCount = staff.filter((s) => s.roles.includes("admin") || s.roles.includes("master_admin")).length;
  const activeTeamsCount = teams.length;
  const presetsCount = presets.length;

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Header & Stat Tiles */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-primary" /> Corporate Teams & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Enterprise RBAC matrix, department section inheritance, reusable role bundles, and security audit logs.
          </p>
        </div>

        {/* Stats Grid (Mobile Responsive) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
          <div className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card shadow-xs space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" /> Total Staff Members
            </span>
            <p className="text-xl sm:text-2xl font-bold font-display text-foreground">{totalStaff}</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card shadow-xs space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" /> Admin Users
            </span>
            <p className="text-xl sm:text-2xl font-bold font-display text-emerald-500">{adminCount}</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card shadow-xs space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users2 className="w-3.5 h-3.5 text-indigo-400" /> Active Departments
            </span>
            <p className="text-xl sm:text-2xl font-bold font-display text-foreground">{activeTeamsCount}</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card shadow-xs space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-500" /> Role Presets
            </span>
            <p className="text-xl sm:text-2xl font-bold font-display text-foreground">{presetsCount}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation - Standard Corporate Icons & Mobile Responsive */}
      <Tabs defaultValue="matrix" className="space-y-4 sm:space-y-5 w-full">
        <TabsList className="w-full h-auto grid grid-cols-2 sm:grid-cols-4 p-1.5 bg-muted/40 border border-border/70 rounded-xl sm:rounded-2xl gap-1.5">
          <TabsTrigger value="matrix" className="text-xs font-semibold rounded-lg sm:rounded-xl py-2.5 sm:py-2.5 gap-1.5 justify-center">
            <ShieldCheck className="w-3.5 h-3.5" /> Permissions
          </TabsTrigger>
          <TabsTrigger value="presets" className="text-xs font-semibold rounded-lg sm:rounded-xl py-2.5 sm:py-2.5 gap-1.5 justify-center">
            <Layers className="w-3.5 h-3.5" /> Role Bundles
          </TabsTrigger>
          <TabsTrigger value="designations" className="text-xs font-semibold rounded-lg sm:rounded-xl py-2.5 sm:py-2.5 gap-1.5 justify-center">
            <Briefcase className="w-3.5 h-3.5" /> Job Titles
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs font-semibold rounded-lg sm:rounded-xl py-2.5 sm:py-2.5 gap-1.5 justify-center">
            <FileText className="w-3.5 h-3.5" /> Security Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="w-full">
          <MatrixTab staff={staff as StaffMemberDetail[]} sections={sections} presets={presets} teams={teams} />
        </TabsContent>

        <TabsContent value="presets" className="w-full">
          <PresetsTab sections={sections} presets={presets} staff={staff as StaffMemberDetail[]} />
        </TabsContent>

        <TabsContent value="designations" className="w-full">
          <DesignationsTab />
        </TabsContent>

        <TabsContent value="audit" className="w-full">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
