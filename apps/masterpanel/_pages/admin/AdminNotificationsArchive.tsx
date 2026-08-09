"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/app-toast";
import { Trash2, Bell, Inbox, Archive } from "lucide-react";

interface NotifRow {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
  cleared_at: string | null;
  user_id: string | null;
}

export default function AdminNotificationsArchive() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["profile-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("notifications") as any)
        .select("*")
        .or(`user_id.eq.${user!.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as NotifRow[];
    },
    enabled: !!user,
  });

  const deleteAll = useMutation({
    mutationFn: async () => {
      const ownIds = rows.filter((n) => n.user_id === user!.id).map((n) => n.id);
      if (ownIds.length === 0) return 0;
      const { error } = await supabase.from("notifications").delete().in("id", ownIds);
      if (error) throw error;
      return ownIds.length;
    },
    onSuccess: (n) => {
      toast({ title: n ? `Deleted ${n} notification${n === 1 ? "" : "s"}` : "Nothing to delete" });
      qc.invalidateQueries({ queryKey: ["profile-notifications"] });
      qc.invalidateQueries({ queryKey: ["bell-notifications"] });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e?.message, variant: "destructive" }),
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Notification deleted" });
      qc.invalidateQueries({ queryKey: ["profile-notifications"] });
      qc.invalidateQueries({ queryKey: ["bell-notifications"] });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e?.message, variant: "destructive" }),
  });

  const archiveOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("notifications") as any)
        .update({ cleared_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Notification archived" });
      qc.invalidateQueries({ queryKey: ["profile-notifications"] });
      qc.invalidateQueries({ queryKey: ["bell-notifications"] });
    },
    onError: (e: any) => toast({ title: "Archive failed", description: e?.message, variant: "destructive" }),
  });

  const active = rows.filter((n) => !n.cleared_at);
  const cleared = rows.filter((n) => !!n.cleared_at);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Notifications</h1>
            <p className="text-xs text-muted-foreground">Active and previously cleared alerts</p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm("Permanently delete ALL of your notifications? This cannot be undone.")) {
              deleteAll.mutate();
            }
          }}
          disabled={deleteAll.isPending || rows.length === 0}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Delete all
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Inbox className="w-4 h-4" /> Active <Badge variant="secondary">{active.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active notifications.</p>
          ) : (
            active.map((n) => (
              <Row
                key={n.id}
                n={n}
                onDelete={(id) => deleteOne.mutate(id)}
                onArchive={(id) => archiveOne.mutate(id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            Cleared <Badge variant="outline">{cleared.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cleared.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing cleared yet.</p>
          ) : (
            cleared.map((n) => <Row key={n.id} n={n} cleared onDelete={(id) => deleteOne.mutate(id)} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  n,
  cleared,
  onDelete,
  onArchive,
}: {
  n: NotifRow;
  cleared?: boolean;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border border-border/50 ${cleared ? "opacity-70" : "bg-card"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{n.title}</p>
          <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
          {!n.is_read && !cleared && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
        {n.message && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{n.message}</p>}
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {new Date(n.created_at).toLocaleString()}
          {n.cleared_at && ` · cleared ${new Date(n.cleared_at).toLocaleString()}`}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!cleared && onArchive && (
          <Button variant="ghost" size="icon" onClick={() => onArchive(n.id)} title="Archive">
            <Archive className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => onDelete(n.id)} title="Delete permanently">
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
