"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { listIdentityAudit } from "@/lib/identity-governance.functions";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { useSeoMeta } from "@/hooks/use-seo-meta";

const actionColor: Record<string, string> = {
  field_change: "bg-muted",
  published: "bg-green-500/15 text-green-600",
  unpublished: "bg-amber-500/15 text-amber-600",
  code_regenerated: "bg-blue-500/15 text-blue-600",
};

const fmtVal = (v: any) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  return String(v).slice(0, 60);
};

export default function AdminIdentityAudit() {
  useSeoMeta("Identity Audit Log", "Every identity change and QR regeneration");
  const fetchFn = useServerFn(listIdentityAudit);
  const [limit] = useState(200);
  const { data = [], isLoading } = useQuery({
    queryKey: ["identity-audit", limit],
    queryFn: () => fetchFn({ data: { limit } as any }),
  });

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-6xl">
      <PageHeader
        title="Identity Audit Log"
        description="Every field change, publish action, and code regeneration."
        icon={<History className="w-5 h-5" />}
      />
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">When</th>
              <th className="p-3 text-left">Actor</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">Field</th>
              <th className="p-3 text-left hidden md:table-cell">Before</th>
              <th className="p-3 text-left hidden md:table-cell">After</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No changes yet.</td></tr>
            ) : (data as any[]).map((r) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </td>
                <td className="p-3 text-xs">{r.actor_name}</td>
                <td className="p-3">
                  <Badge variant="outline" className={actionColor[r.action] ?? ""}>{r.action}</Badge>
                </td>
                <td className="p-3 text-xs font-mono">{r.field ?? "—"}</td>
                <td className="p-3 text-xs hidden md:table-cell text-muted-foreground truncate max-w-[220px]">{fmtVal(r.old_value)}</td>
                <td className="p-3 text-xs hidden md:table-cell truncate max-w-[220px]">{fmtVal(r.new_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
