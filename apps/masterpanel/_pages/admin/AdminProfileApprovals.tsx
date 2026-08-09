"use client";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { listProfileChangeRequests, reviewProfileChangeRequest } from "@/lib/identity-governance.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Inbox, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/lib/app-toast";
import PageHeader from "@/components/admin/PageHeader";
import { useSeoMeta } from "@/hooks/use-seo-meta";

type Tab = "pending" | "approved" | "rejected";

const fieldLabel: Record<string, string> = {
  full_name: "Full name",
  avatar_url: "Avatar",
  phone: "Phone",
  address: "Address",
};

const fmt = (v: any) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export default function AdminProfileApprovals() {
  useSeoMeta("Profile Change Approvals", "Review and approve internal profile edits");
  const qc = useQueryClient();
  const listFn = useServerFn(listProfileChangeRequests);
  const reviewFn = useServerFn(reviewProfileChangeRequest);
  const [tab, setTab] = useState<Tab>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["profile-approvals", tab],
    queryFn: () => listFn({ data: { status: tab } as any }),
  });

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setBusyId(id);
    try {
      await reviewFn({ data: { id, decision, note: notes[id] || undefined } as any });
      toast.success(decision === "approved" ? "Approved & applied" : "Rejected");
      qc.invalidateQueries({ queryKey: ["profile-approvals"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-5xl">
      <PageHeader
        title="Profile Change Approvals"
        description="Review internal profile edits from staff before they apply."
        icon={<Inbox className="w-5 h-5" />}
      />

      <div className="mb-4 inline-flex rounded-lg border border-border/60 bg-card p-1">
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs rounded-md capitalize transition-colors ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (data as any[]).length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center text-sm text-muted-foreground">
          Nothing {tab}.
        </div>
      ) : (
        <div className="space-y-3">
          {(data as any[]).map((r) => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {r.user?.avatar_url ? (
                    <img src={r.user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                      {(r.user?.full_name || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.user?.full_name || "Unnamed"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Requested {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    r.status === "approved" ? "bg-green-500/15 text-green-600" :
                    r.status === "rejected" ? "bg-destructive/15 text-destructive" :
                    "bg-amber-500/15 text-amber-600"
                  }
                >
                  {r.status}
                </Badge>
              </div>

              <div className="rounded-lg border border-border/40 divide-y divide-border/40 text-xs">
                {Object.entries(r.changes ?? {}).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2">
                    <span className="text-muted-foreground">{fieldLabel[k] ?? k}</span>
                    <span className="break-words">{fmt(v)}</span>
                  </div>
                ))}
              </div>

              {r.reviewer_note && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Note: <span className="italic">{r.reviewer_note}</span>
                </p>
              )}

              {tab === "pending" && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Textarea
                    placeholder="Optional note to the requester…"
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    rows={1}
                    className="text-xs min-h-9 flex-1"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => decide(r.id, "rejected")}
                      disabled={busyId === r.id}
                    >
                      {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => decide(r.id, "approved")} disabled={busyId === r.id}>
                      {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                      Approve & apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
