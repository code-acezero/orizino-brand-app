"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { listAuditLog } from "@/lib/staff.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDistanceToNow, format } from "date-fns";
import {
  ClipboardList, Search, Filter, Download, RefreshCw,
  ShieldCheck, UserMinus, UserPlus, Building2, KeyRound,
  Eye, Code2, Layers, CheckCircle2,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/TableStates";

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  grant_role: { label: "Role Granted", color: "#10b981", icon: UserPlus },
  revoke_role: { label: "Role Revoked", color: "#f43f5e", icon: UserMinus },
  update_section_access: { label: "Permissions Updated", color: "#6366f1", icon: KeyRound },
  assign_designation: { label: "Designation Assigned", color: "#8b5cf6", icon: ShieldCheck },
  create_team: { label: "Team Created", color: "#06b6d4", icon: Building2 },
  update_team: { label: "Team Updated", color: "#f59e0b", icon: Building2 },
  delete_team: { label: "Team Deleted", color: "#e11d48", icon: Building2 },
  update_team_members: { label: "Team Roster Updated", color: "#3b82f6", icon: Building2 },
  update_team_sections: { label: "Team Permissions Updated", color: "#8b5cf6", icon: KeyRound },
  create_designation: { label: "Title Created", color: "#10b981", icon: ShieldCheck },
  update_designation: { label: "Title Updated", color: "#f59e0b", icon: ShieldCheck },
  delete_designation: { label: "Title Deleted", color: "#f43f5e", icon: ShieldCheck },
};

export default function AdminAuditLog() {
  const fetchLog = useServerFn(listAuditLog);

  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectItem, setInspectItem] = useState<any>(null);

  const pageSize = 50;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-log", page, actionFilter],
    queryFn: () =>
      fetchLog({
        data: {
          limit: pageSize,
          offset: page * pageSize,
          action: actionFilter === "all" ? undefined : actionFilter,
        },
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredItems = items.filter((item: any) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (item.actor_name && item.actor_name.toLowerCase().includes(q)) ||
      (item.target_name && item.target_name.toLowerCase().includes(q)) ||
      (item.action && item.action.toLowerCase().includes(q)) ||
      (item.entity && item.entity.toLowerCase().includes(q))
    );
  });

  const exportCSV = () => {
    if (items.length === 0) return;
    const headers = ["Timestamp", "Actor", "Action", "Entity", "Entity ID", "Metadata"];
    const rows = items.map((i: any) => [
      i.created_at,
      i.actor_name,
      i.action,
      i.entity || "",
      i.entity_id || "",
      JSON.stringify(i.meta || {}),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `security-audit-log-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-primary" /> Security & Access Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tamper-evident record of all team changes, role grants, revocations, and permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={items.length === 0}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by actor name, affected target, or entity..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="w-full sm:w-60">
          <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val); setPage(0); }}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Action Types</SelectItem>
              <SelectItem value="grant_role">Role Grants</SelectItem>
              <SelectItem value="revoke_role">Role Revocations</SelectItem>
              <SelectItem value="update_section_access">Section Permissions</SelectItem>
              <SelectItem value="create_team">Team Created</SelectItem>
              <SelectItem value="update_team">Team Updated</SelectItem>
              <SelectItem value="delete_team">Team Deleted</SelectItem>
              <SelectItem value="assign_designation">Designation Assigned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground text-[11px] border-b border-border/70">
              <tr>
                <th className="px-4 py-3 min-w-[140px]">When</th>
                <th className="px-4 py-3 min-w-[160px]">Actor</th>
                <th className="px-4 py-3 min-w-[180px]">Action</th>
                <th className="px-4 py-3 min-w-[160px]">Target</th>
                <th className="px-4 py-3">Details / Metadata</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredItems.map((item: any) => {
                const config = ACTION_CONFIG[item.action] || {
                  label: item.action,
                  color: "#6366f1",
                  icon: Layers,
                };
                const Icon = config.icon;

                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    {/* Timestamp */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {format(new Date(item.created_at), "MMM d, yyyy HH:mm:ss")}
                        </span>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                          {(item.actor_name || "A")[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground truncate">
                          {item.actor_name || "System"}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${config.color}15`,
                          color: config.color,
                          borderColor: `${config.color}35`,
                        }}
                        className="text-[11px] font-medium gap-1"
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </td>

                    {/* Target */}
                    <td className="px-4 py-3">
                      {item.target_name ? (
                        <div className="font-medium text-foreground truncate">
                          {item.target_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </td>

                    {/* Metadata Preview */}
                    <td className="px-4 py-3 max-w-xs truncate font-mono text-[11px] text-muted-foreground">
                      {JSON.stringify(item.meta || {})}
                    </td>

                    {/* Inspect Button */}
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInspectItem(item)}
                        className="h-7 text-xs gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-muted-foreground">
                    <ClipboardList className="w-8 h-8 opacity-30 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">No audit log entries</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Privileged staff actions are recorded here in real time.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} events
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="h-7 text-xs"
              >
                Previous
              </Button>
              <span className="px-2 font-mono">{page + 1} / {totalPages}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="h-7 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Detail Dialog */}
      <Dialog open={!!inspectItem} onOpenChange={(v) => !v && setInspectItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" /> Audit Event Details
            </DialogTitle>
            <DialogDescription>
              Structured payload recorded for security traceability.
            </DialogDescription>
          </DialogHeader>

          {inspectItem && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Actor</span>
                  <p className="font-semibold text-foreground mt-0.5">{inspectItem.actor_name || "System"}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Action</span>
                  <p className="font-semibold text-foreground mt-0.5">{inspectItem.action}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Timestamp</span>
                  <p className="font-semibold text-foreground mt-0.5">{inspectItem.created_at}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Entity</span>
                  <p className="font-semibold text-foreground mt-0.5">{inspectItem.entity || "—"}</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Metadata JSON Payload:
                </span>
                <pre className="p-3 rounded-lg bg-muted/40 border border-border font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(inspectItem.meta || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
