"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/server-fn-compat";
import { listStaff } from "@/lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/app-toast";
import {
  ShieldCheck, LayoutGrid, Users2, Wand2, Plus, Trash2, Save,
  Loader2, Search, X,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────── */

interface StaffSection { key: string; label: string; description: string | null; sort_order: number }
interface Preset { id: string; name: string; description: string | null; sections: string[]; is_system: boolean }
interface Staff { user_id: string; full_name?: string; email?: string; roles: string[] }

/* ────────────────────────────────────────────────────────────── */
/* Tab A — Matrix                                                 */
/* ────────────────────────────────────────────────────────────── */

function MatrixTab({ staff, sections, presets }: { staff: Staff[]; sections: StaffSection[]; presets: Preset[] }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: accessRows = [] } = useQuery({
    queryKey: ["staff-access", "all"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_section_access").select("user_id, section");
      return data ?? [];
    },
  });

  // Map<user_id, Set<section>>
  const grantMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of accessRows as any[]) {
      if (!m.has(r.user_id)) m.set(r.user_id, new Set());
      m.get(r.user_id)!.add(r.section);
    }
    return m;
  }, [accessRows]);

  const filteredStaff = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return staff;
    return staff.filter((s) => (s.full_name || s.email || s.user_id).toLowerCase().includes(needle));
  }, [staff, q]);

  const toggle = useMutation({
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
      qc.invalidateQueries({ queryKey: ["staff-access"] });
      qc.invalidateQueries({ queryKey: ["staff-sections"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update access"),
  });

  const bulkApplyPreset = useMutation({
    mutationFn: async (preset: Preset) => {
      if (selected.size === 0) throw new Error("Select at least one staff member");
      const users = Array.from(selected);
      // Wipe existing + insert preset sections for each user
      const { error: delErr } = await supabase
        .from("staff_section_access")
        .delete()
        .in("user_id", users);
      if (delErr) throw delErr;
      if (preset.sections.length > 0) {
        const rows = users.flatMap((uid) => preset.sections.map((section) => ({ user_id: uid, section, preset_id: preset.id })));
        const { error: insErr } = await supabase.from("staff_section_access").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_d, preset) => {
      toast.success(`Applied "${preset.name}" to ${selected.size} member(s)`);
      qc.invalidateQueries({ queryKey: ["staff-access"] });
      qc.invalidateQueries({ queryKey: ["staff-sections"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const toggleRowSelect = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const allSelected = filteredStaff.length > 0 && filteredStaff.every((s) => selected.has(s.user_id));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff…" className="pl-8 h-9" />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              {presets.map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant="outline"
                  disabled={bulkApplyPreset.isPending}
                  onClick={() => bulkApplyPreset.mutate(p)}
                  className="h-8"
                >
                  <Wand2 className="w-3 h-3 mr-1.5" /> Apply {p.name}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="h-8">
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Matrix */}
      <div className="rounded-xl border border-border/60 bg-card overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="sticky left-0 bg-muted/40 z-10 text-left px-3 py-2 min-w-[220px] border-r border-border/50">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => {
                      if (v) setSelected(new Set(filteredStaff.map((s) => s.user_id)));
                      else setSelected(new Set());
                    }}
                  />
                  <span>Staff ({filteredStaff.length})</span>
                </label>
              </th>
              {sections.map((s) => (
                <th key={s.key} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{s.label}</span>
                    <code className="text-[9px] text-muted-foreground/70 font-normal">{s.key}</code>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((member) => {
              const isAdmin = member.roles?.includes("admin");
              const granted = grantMap.get(member.user_id) ?? new Set<string>();
              return (
                <tr key={member.user_id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="sticky left-0 bg-card hover:bg-muted/20 z-10 px-3 py-2 border-r border-border/50">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selected.has(member.user_id)}
                        onCheckedChange={() => toggleRowSelect(member.user_id)}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                          {member.full_name || member.email || member.user_id.slice(0, 8)}
                          {isAdmin && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/40 text-primary">
                              <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> admin
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{member.email}</div>
                      </div>
                    </label>
                  </td>
                  {sections.map((s) => {
                    const enabled = isAdmin || granted.has(s.key);
                    const busy =
                      toggle.isPending &&
                      (toggle.variables as any)?.userId === member.user_id &&
                      (toggle.variables as any)?.section === s.key;
                    return (
                      <td key={s.key} className="text-center px-2 py-1.5">
                        {busy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground inline" />
                        ) : (
                          <Checkbox
                            checked={enabled}
                            disabled={isAdmin}
                            onCheckedChange={(v) =>
                              toggle.mutate({ userId: member.user_id, section: s.key, enable: !!v })
                            }
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan={sections.length + 1} className="text-center py-10 text-sm text-muted-foreground">
                  No staff match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Admins implicitly have access to every section. Toggle a cell to grant or revoke direct access; use the preset
        buttons to apply a bundle to multiple staff at once.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Tab C — Preset CRUD                                            */
/* ────────────────────────────────────────────────────────────── */

function PresetsTab({ sections, presets }: { sections: StaffSection[]; presets: Preset[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Preset | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  const startEdit = (p: Preset | null) => {
    if (p) {
      setEditing(p);
      setName(p.name);
      setDescription(p.description ?? "");
      setSelectedSections(new Set(p.sections));
    } else {
      setEditing(null);
      setName("");
      setDescription("");
      setSelectedSections(new Set());
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
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
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const del = useMutation({
    mutationFn: async (p: Preset) => {
      const { error } = await supabase.from("staff_role_presets").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preset deleted");
      qc.invalidateQueries({ queryKey: ["staff-presets"] });
      if (editing) startEdit(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const toggleSection = (key: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Preset list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Presets</h3>
          <Button size="sm" variant="outline" onClick={() => startEdit(null)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New
          </Button>
        </div>
        <div className="space-y-1.5">
          {presets.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                editing?.id === p.id
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/60 bg-card hover:bg-muted/40"
              }`}
              onClick={() => startEdit(p)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {p.name}
                    {p.is_system && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1">system</Badge>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{p.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.sections.map((s) => (
                      <span key={s} className="text-[10px] rounded-full bg-primary/10 text-primary px-1.5 py-0.5">{s}</span>
                    ))}
                    {p.sections.length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">no sections</span>
                    )}
                  </div>
                </div>
                {!p.is_system && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete preset "${p.name}"?`)) del.mutate(p);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {presets.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No presets yet — click <strong>New</strong> to create one.
            </p>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">{editing ? `Edit "${editing.name}"` : "New preset"}</h3>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Team" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short summary of what this preset unlocks"
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Sections ({selectedSections.size})</label>
          <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
            {sections.map((s) => {
              const enabled = selectedSections.has(s.key);
              return (
                <label
                  key={s.key}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 border cursor-pointer text-xs ${
                    enabled ? "border-primary/40 bg-primary/5" : "border-border/50 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <Checkbox checked={enabled} onCheckedChange={() => toggleSection(s.key)} />
                  <span className="truncate">{s.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t border-border/40">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {save.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            {editing ? "Save changes" : "Create preset"}
          </Button>
          {editing && (
            <Button size="sm" variant="ghost" onClick={() => startEdit(null)}>Cancel</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Main                                                           */
/* ────────────────────────────────────────────────────────────── */

export default function AccessManager() {
  const fetchStaff = useServerFn(listStaff);

  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => fetchStaff() });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-primary" /> Access Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grant and revoke which Control Panel sections your staff can see. Use the matrix for bulk changes, the
          Employees page for a per-staff drawer, and the Presets tab to manage role bundles.
        </p>
      </div>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix"><LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Matrix</TabsTrigger>
          <TabsTrigger value="presets"><Wand2 className="w-3.5 h-3.5 mr-1.5" /> Presets</TabsTrigger>
          <TabsTrigger value="perStaff"><Users2 className="w-3.5 h-3.5 mr-1.5" /> Per staff</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          <MatrixTab staff={staff as Staff[]} sections={sections} presets={presets} />
        </TabsContent>

        <TabsContent value="presets">
          <PresetsTab sections={sections} presets={presets} />
        </TabsContent>

        <TabsContent value="perStaff">
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-sm">
            <p className="font-medium mb-1">Per-staff drawer lives on the Employees page</p>
            <p className="text-muted-foreground text-xs mb-3">
              Open <a href="/team/employees" className="text-primary underline">Corporate → Employees</a>, click a
              staff member, and use the dialog to fine-tune their section access or apply a preset.
            </p>
            <p className="text-muted-foreground text-xs">
              Founders can still use the Matrix tab here for a birds-eye grid of every staff × section combination.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
// code:4ce0
