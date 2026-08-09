"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useServerFn } from "@/lib/server-fn-compat";
import { listStaff, grantStaffRole, revokeStaffRole } from "@/lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/app-toast";
import { useNavigate } from "@/lib/router-compat";
import {
  AlertCircle, RefreshCw, Trash2, ShieldCheck, Users,
  ChevronRight, UserPlus, Settings2, Check, Loader2,
  Briefcase, BookOpen, Palette, BarChart3, Search, Bot,
  ShoppingCart, Package, Globe, Megaphone, UserCircle2,
} from "lucide-react";

/* ── Section icons ── */
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

/* ── Types ── */
interface StaffSection { key: string; label: string; description: string | null; sort_order: number; }
interface Preset { id: string; name: string; description: string | null; sections: string[]; is_system: boolean; }
interface StaffMember { user_id: string; full_name: string | null; email: string | null; roles: string[]; }

const ROLE_LABELS: Record<string, string> = {
  master_admin: "Master Admin",
  admin: "Admin",
  moderator: "Moderator",
  manager: "Manager",
  maintainer: "Maintainer",
  support: "Customer Support",
  marketing: "Marketing",
};

/* ── Access management dialog ── */
function StaffAccessDialog({
  member,
  sections,
  presets,
  open,
  onClose,
}: {
  member: StaffMember;
  sections: StaffSection[];
  presets: Preset[];
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const { data: currentAccess = [], isLoading: accessLoading } = useQuery({
    queryKey: ["staff-access", member.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_section_access")
        .select("section, preset_id")
        .eq("user_id", member.user_id);
      return data ?? [];
    },
    enabled: open,
  });

  const grantedSections = new Set(currentAccess.map((a: any) => a.section as string));

  const applyPreset = useMutation({
    mutationFn: async (preset: Preset) => {
      await supabase.from("staff_section_access").delete().eq("user_id", member.user_id);
      if (preset.sections.length > 0) {
        await supabase.from("staff_section_access").insert(
          preset.sections.map((s) => ({ user_id: member.user_id, section: s, preset_id: preset.id }))
        );
      }
    },
    onSuccess: (_d, preset) => {
      toast.success(`Applied "${preset.name}" preset`);
      qc.invalidateQueries({ queryKey: ["staff-access", member.user_id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to apply preset"),
  });

  const toggleSection = useMutation({
    mutationFn: async ({ section, enable }: { section: string; enable: boolean }) => {
      if (enable) {
        await supabase.from("staff_section_access").upsert({ user_id: member.user_id, section }, { onConflict: "user_id,section" });
      } else {
        await supabase.from("staff_section_access").delete().eq("user_id", member.user_id).eq("section", section);
      }
    },
    onSuccess: (_d, { section, enable }) => {
      toast.success(enable ? `Granted: ${section}` : `Revoked: ${section}`);
      qc.invalidateQueries({ queryKey: ["staff-access", member.user_id] });
      qc.invalidateQueries({ queryKey: ["staff-sections"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const revokeAll = useMutation({
    mutationFn: async () => {
      await supabase.from("staff_section_access").delete().eq("user_id", member.user_id);
    },
    onSuccess: () => {
      toast.success("All access revoked");
      qc.invalidateQueries({ queryKey: ["staff-access", member.user_id] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Section Access — {member.full_name || member.email || "Staff"}
          </DialogTitle>
          <DialogDescription>
            Apply a preset role bundle, then fine-tune individual section toggles.
          </DialogDescription>
        </DialogHeader>

        {/* Preset picker */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-2">Quick presets</p>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                disabled={applyPreset.isPending}
                onClick={() => applyPreset.mutate(preset)}
                className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 p-3 text-left transition-colors disabled:opacity-50"
              >
                <span className="text-sm font-medium">{preset.name}</span>
                {preset.description && (
                  <span className="text-[11px] text-muted-foreground leading-tight">{preset.description}</span>
                )}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {preset.sections.map((s) => (
                    <span key={s} className="text-[10px] rounded-full bg-primary/10 text-primary px-1.5 py-0.5 font-medium">{s}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Per-section toggles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Section overrides</p>
            {grantedSections.size > 0 && (
              <button
                onClick={() => revokeAll.mutate()}
                disabled={revokeAll.isPending}
                className="text-[11px] text-destructive hover:underline"
              >
                Revoke all
              </button>
            )}
          </div>

          {accessLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {sections.map((sec) => {
                const enabled = grantedSections.has(sec.key);
                const busy = toggleSection.isPending && (toggleSection.variables as any)?.section === sec.key;
                return (
                  <div
                    key={sec.key}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`shrink-0 ${enabled ? "text-primary" : "text-muted-foreground"}`}>
                        {SECTION_ICONS[sec.key] ?? <BookOpen className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{sec.label}</p>
                        {sec.description && (
                          <p className="text-[11px] text-muted-foreground leading-tight truncate">{sec.description}</p>
                        )}
                      </div>
                    </div>
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => toggleSection.mutate({ section: sec.key, enable: v })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {grantedSections.size > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-primary">{grantedSections.size} section{grantedSections.size !== 1 ? "s" : ""} granted.</span>
            {" "}Staff sees only these sections in Master Panel. With a single section, they are redirected there directly.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Main component ── */
export default function AdminEmployees() {
  const fetchStaff = useServerFn(listStaff);
  const grant = useServerFn(grantStaffRole);
  const revoke = useServerFn(revokeStaffRole);
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"master_admin" | "admin" | "moderator" | "manager" | "maintainer" | "support" | "marketing">("moderator");
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: staff = [], error: loadError, isFetching, refetch } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetchStaff(),
  });

  const isMasterAdmin = (staff as StaffMember[]).some((s) => s.user_id === user?.id && s.roles.includes("master_admin"));

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

  const grantMut = useMutation({
    mutationFn: () => grant({ data: { email, role } }),
    onSuccess: () => { toast.success("Role granted"); setEmail(""); qc.invalidateQueries({ queryKey: ["staff"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const revokeMut = useMutation({
    mutationFn: (v: { userId: string; role: string }) => revoke({ data: v as any }),
    onSuccess: () => { toast.success("Role revoked"); qc.invalidateQueries({ queryKey: ["staff"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const openAccess = useCallback((member: StaffMember) => {
    setSelectedMember(member);
    setAccessDialogOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <Users className="w-7 h-7" /> Employees
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage team roles and grant section-level access. Staff with a single section are redirected there directly.
        </p>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Staff couldn't load</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError instanceof Error ? loadError.message : "Supabase returned an unexpected error."}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Add staff form */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4 text-primary" /> Add team member
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Email of existing user</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
              onKeyDown={(e) => e.key === "Enter" && email && grantMut.mutate()}
            />
          </div>
          <div className="w-44">
            <label className="text-xs text-muted-foreground">Base role</label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="support">Customer Support</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="maintainer">Maintainer</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {isMasterAdmin && <SelectItem value="master_admin">Master Admin</SelectItem>}
              </SelectContent>
            </Select>
            {role === "master_admin" && (
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">
                Full, unrestricted control — including the ability to appoint other master admins.
              </p>
            )}
          </div>
          <Button disabled={!email || grantMut.isPending} onClick={() => grantMut.mutate()}>
            {grantMut.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1.5" />}
            Grant
          </Button>
        </div>
      </div>

      {/* Staff table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="bg-muted/30 px-4 py-2.5 flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">
            Team members ({staff.length})
          </p>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="h-7 text-xs">
            <RefreshCw className={`w-3 h-3 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="divide-y divide-border/50">
          {(staff as StaffMember[]).map((s) => (
            <div key={s.user_id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors group">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center shrink-0 text-sm font-bold text-primary-foreground">
                {(s.full_name || s.email || "S").charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{s.email || "Email unavailable"}</p>
              </div>

              {/* Roles */}
              <div className="flex flex-wrap gap-1 shrink-0">
                {s.roles.map((r) => (
                  <Badge
                    key={r}
                    variant={r === "master_admin" || r === "admin" ? "default" : "secondary"}
                    className={`text-[11px] ${r === "master_admin" ? "bg-amber-500/90 hover:bg-amber-500/90" : ""}`}
                  >
                    {ROLE_LABELS[r] ?? r}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => navigate(`/admin/profile?userId=${s.user_id}`)}
                >
                  <UserCircle2 className="w-3.5 h-3.5 text-primary" /> Edit Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => openAccess(s)}
                >
                  <Settings2 className="w-3.5 h-3.5" /> Sections
                </Button>
                {s.roles.filter((r) => r !== "master_admin" || isMasterAdmin).map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => revokeMut.mutate({ userId: s.user_id, role: r })}
                    disabled={revokeMut.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />{ROLE_LABELS[r] ?? r}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          {staff.length === 0 && !loadError && (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
              <Users className="w-8 h-8 opacity-30" />
              <p className="text-sm">No team members yet</p>
              <p className="text-xs">Add an existing user's email above to grant them a role</p>
            </div>
          )}
        </div>
      </div>

      {/* Section legend */}
      {sections.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-3">Available sections</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {sections.map((sec) => (
              <div key={sec.key} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground shrink-0">
                  {SECTION_ICONS[sec.key] ?? <BookOpen className="w-4 h-4" />}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{sec.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Access dialog */}
      {selectedMember && (
        <StaffAccessDialog
          member={selectedMember}
          sections={sections}
          presets={presets}
          open={accessDialogOpen}
          onClose={() => { setAccessDialogOpen(false); setSelectedMember(null); }}
        />
      )}
    </div>
  );
}
// code:4ce0
