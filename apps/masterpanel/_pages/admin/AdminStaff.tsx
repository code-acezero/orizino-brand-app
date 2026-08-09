"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { listStaff, grantStaffRole, revokeStaffRole } from "@/lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/app-toast";
import { AlertCircle, RefreshCw, Trash2, ShieldCheck, Briefcase } from "lucide-react";
import { EmptyState } from "@/components/admin/TableStates";
import PageHeader from "@/components/admin/PageHeader";

export default function AdminStaff() {
  const fetchStaff = useServerFn(listStaff);
  const grant = useServerFn(grantStaffRole);
  const revoke = useServerFn(revokeStaffRole);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "moderator" | "manager" | "maintainer" | "support" | "marketing">("moderator");

  const { data: staff = [], error: loadError, isFetching, refetch } = useQuery({ queryKey: ["staff"], queryFn: () => fetchStaff() });

  const grantMut = useMutation({
    mutationFn: () => grant({ data: { email, role } }),
    onSuccess: () => { toast.success("Role granted"); setEmail(""); qc.invalidateQueries({ queryKey: ["staff"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const revokeMut = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "moderator" }) => revoke({ data: v }),
    onSuccess: () => { toast.success("Role revoked"); qc.invalidateQueries({ queryKey: ["staff"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Briefcase className="w-7 h-7" />Staff</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage admins and moderators. Customers live in the Customers page.</p>
      </div>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Staff couldn’t load</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError instanceof Error ? loadError.message : "Supabase returned an unexpected error."}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-lg border border-border p-4 bg-card flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Email of existing user</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com" />
        </div>
        <div className="w-40">
          <label className="text-xs text-muted-foreground">Role</label>
          <Select value={role} onValueChange={(v) => setRole(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="support">Customer Support</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="maintainer">Maintainer</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button disabled={!email || grantMut.isPending} onClick={() => grantMut.mutate()}><ShieldCheck className="w-4 h-4 mr-1.5" />Grant</Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Roles</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s: any) => (
              <tr key={s.user_id} className="border-t border-border/50">
                <td className="px-3 py-2 font-medium">{s.full_name || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.email || "Unavailable without service key"}</td>
                <td className="px-3 py-2 space-x-1">
                  {s.roles.map((r: string) => <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>)}
                </td>
                <td className="px-3 py-2 text-right space-x-1">
                  {s.roles.map((r: string) => (
                    <Button key={r} size="sm" variant="ghost" onClick={() => revokeMut.mutate({ userId: s.user_id, role: r as any })}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" /><span className="ml-1 text-xs">{r}</span>
                    </Button>
                  ))}
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    icon={<Briefcase className="w-5 h-5" />}
                    message="No staff yet"
                    hint="Grant a role to your first team member using the form above."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// code:4ce0
