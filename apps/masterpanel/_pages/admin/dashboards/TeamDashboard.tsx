"use client";
import { Users2, ShieldCheck, ClipboardList, Building2, KeyRound } from "lucide-react";
import SectionDashboardShell from "@/components/admin/dashboards/SectionDashboardShell";
import KpiCard from "@/components/admin/dashboards/KpiCard";
import { useKpiCount } from "@/components/admin/dashboards/useKpiCount";

export default function TeamDashboard() {
  const teams = useKpiCount(["teams"], "teams");
  const members = useKpiCount(["team-members"], "team_members");
  const staff = useKpiCount(["staff-access"], "staff_section_access");
  const audit24h = useKpiCount(["team-audit", "24h"], "team_audit_log", (q) => q.gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString()));
  const staffAudit24h = useKpiCount(["staff-audit", "24h"], "staff_audit_log", (q) => q.gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString()));
  const presets = useKpiCount(["role-presets"], "staff_role_presets");

  return (
    <SectionDashboardShell
      title="Team & Access"
      description="Employees, teams, roles, and audit trail"
      icon={Users2}
      color="#a855f7"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Teams" value={teams.data ?? "—"} sub="Groups configured" icon={Building2} color="#a855f7" href="/team/teams" loading={teams.isLoading} />
        <KpiCard title="Team members" value={members.data ?? "—"} sub="Across all teams" icon={Users2} color="#38bdf8" href="/team/employees" loading={members.isLoading} />
        <KpiCard title="Staff w/ access" value={staff.data ?? "—"} sub="Section grants" icon={ShieldCheck} color="#10b981" href="/team/access" loading={staff.isLoading} />
        <KpiCard title="Role presets" value={presets.data ?? "—"} sub="Reusable templates" icon={KeyRound} color="#f59e0b" href="/team/staff" loading={presets.isLoading} />
        <KpiCard title="Team audit (24h)" value={audit24h.data ?? 0} sub="Recent changes" icon={ClipboardList} color="#ec4899" href="/team/audit-log" loading={audit24h.isLoading} />
        <KpiCard title="Staff audit (24h)" value={staffAudit24h.data ?? 0} sub="Access log events" icon={ClipboardList} color="#0ea5e9" href="/team/audit-log" loading={staffAudit24h.isLoading} />
      </div>
    </SectionDashboardShell>
  );
}
// code:4ce0
