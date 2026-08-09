"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "@/lib/app-toast";

type Reason = {
  id: string;
  kind: "cancellation" | "return";
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

type Editing = { id?: string; kind: "cancellation" | "return"; label: string; description: string; sort_order: number; is_active: boolean };

const emptyEdit = (kind: "cancellation" | "return"): Editing => ({
  kind, label: "", description: "", sort_order: 10, is_active: true,
});

export default function AdminOrderReasons() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"cancellation" | "return">("cancellation");
  const [editing, setEditing] = useState<Editing | null>(null);

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ["order_reasons"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("order_reasons")
        .select("*")
        .order("kind")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Reason[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (r: Editing) => {
      if (r.id) {
        const { error } = await (supabase as any).from("order_reasons").update({
          label: r.label.trim(), description: r.description.trim() || null,
          sort_order: r.sort_order, is_active: r.is_active, kind: r.kind,
        }).eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("order_reasons").insert({
          kind: r.kind, label: r.label.trim(), description: r.description.trim() || null,
          sort_order: r.sort_order, is_active: r.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order_reasons"] });
      setEditing(null);
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("order_reasons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order_reasons"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("order_reasons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order_reasons"] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  const filtered = reasons.filter((r) => r.kind === tab);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Order Reasons</h1>
          <p className="text-sm text-muted-foreground">Manage the reasons customers see when cancelling or requesting a return.</p>
        </div>
        <Button onClick={() => setEditing(emptyEdit(tab))}>
          <Plus className="w-4 h-4 mr-1" /> Add reason
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
          <TabsTrigger value="return">Return</TabsTrigger>
        </TabsList>

        {(["cancellation", "return"] as const).map((k) => (
          <TabsContent key={k} value={k} className="space-y-2 mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No reasons yet. Click "Add reason" to create one.</CardContent></Card>
            ) : (
              filtered.map((r) => (
                <Card key={r.id} className={r.is_active ? "" : "opacity-60"}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.label}</div>
                      {r.description && <div className="text-xs text-muted-foreground truncate">{r.description}</div>}
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">#{r.sort_order}</span>
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) => toggleMut.mutate({ id: r.id, is_active: v })}
                    />
                    <Button size="icon" variant="ghost" onClick={() => setEditing({
                      id: r.id, kind: r.kind, label: r.label,
                      description: r.description || "", sort_order: r.sort_order, is_active: r.is_active,
                    })}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      if (confirm(`Delete "${r.label}"?`)) deleteMut.mutate(r.id);
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit reason" : "Add reason"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Label</label>
                <Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="e.g. Item arrived damaged" />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} placeholder="Helper text shown to customer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Sort order</label>
                  <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} />
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                  <span className="text-sm">Active</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              disabled={!editing?.label.trim() || saveMut.isPending}
              onClick={() => editing && saveMut.mutate(editing)}
            >
              {saveMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
