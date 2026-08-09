"use client";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit3, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingRow, TableEmptyRow } from "@/components/admin/TableStates";

const emptyMethod = { name: "", description: "", price: 0, estimated_days: "", is_active: true, sort_order: 0, min_order_free: null as number | null };

const AdminShipping: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyMethod);

  // Shipping & Tax settings from site_settings
  const [shippingFee, setShippingFee] = useState("5.00");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("");
  const [taxRate, setTaxRate] = useState("0");

  const { data: methods, isLoading } = useQuery({
    queryKey: ["admin-shipping"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_methods").select("*").order("sort_order");
      return data || [];
    },
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["admin-shipping-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["shipping_fee", "free_shipping_threshold", "tax_rate"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
      });
      return map;
    },
  });

  useEffect(() => {
    if (siteSettings) {
      setShippingFee(String(siteSettings.shipping_fee ?? "5.00"));
      setFreeShippingThreshold(String(siteSettings.free_shipping_threshold ?? ""));
      setTaxRate(String(siteSettings.tax_rate ?? "0"));
    }
  }, [siteSettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const items = [
        { key: "shipping_fee", value: shippingFee },
        { key: "free_shipping_threshold", value: freeShippingThreshold },
        { key: "tax_rate", value: taxRate },
      ];
      for (const item of items) {
        await supabase.from("site_settings").upsert(
          { key: item.key, value: item.value as any, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipping-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Shipping & Tax settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, min_order_free: form.min_order_free || null };
      if (editing) await supabase.from("shipping_methods").update(payload).eq("id", editing.id);
      else await supabase.from("shipping_methods").insert(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipping"] });
      setDialogOpen(false);
      toast({ title: editing ? "Method updated" : "Method created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from("shipping_methods").delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-shipping"] }); toast({ title: "Deleted" }); },
  });

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("shipping_methods").update({ is_active: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-shipping"] });
  };

  const openAdd = () => { setEditing(null); setForm(emptyMethod); setDialogOpen(true); };
  const openEdit = (m: any) => {
    setEditing(m);
    setForm({
      name: m.name, description: m.description || "", price: Number(m.price),
      estimated_days: m.estimated_days || "", is_active: m.is_active,
      sort_order: m.sort_order, min_order_free: m.min_order_free ? Number(m.min_order_free) : null,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Shipping & Tax</h1>
          <p className="text-sm text-muted-foreground">Manage shipping methods, fees, and tax rates</p>
        </div>
        <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" /> Add Method</Button>
      </div>

      {/* Shipping & Tax Settings Card */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm">Default Shipping & Tax</CardTitle>
          <CardDescription className="text-xs">Global shipping fee and tax rate applied at checkout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Default Shipping Fee</Label>
              <Input type="number" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Free Shipping Threshold</Label>
              <Input type="number" value={freeShippingThreshold} onChange={(e) => setFreeShippingThreshold(e.target.value)} placeholder="Orders above this get free shipping" />
            </div>
            <div>
              <Label className="text-xs">Tax Rate (%)</Label>
              <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} step="0.1" />
            </div>
          </div>
          <Button size="sm" onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>
            {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Shipping Methods Table */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Est. Days</TableHead>
              <TableHead>Free Above</TableHead>
              <TableHead>COD</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoadingRow cols={7} rows={5} />}
            {!isLoading && methods && methods.length === 0 && (
              <TableEmptyRow cols={7} icon={<Truck className="w-5 h-5" />} message="No shipping methods" hint="Create your first shipping method to get started." />
            )}
            {methods?.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{m.name}</p>
                      {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>৳{Number(m.price).toFixed(0)}</TableCell>
                <TableCell className="text-sm">{m.estimated_days || "—"}</TableCell>
                <TableCell className="text-sm">{m.min_order_free ? `৳${Number(m.min_order_free).toFixed(0)}` : "—"}</TableCell>
                <TableCell>
                  <Switch checked={(m as any).cod_enabled !== false} onCheckedChange={async (v) => {
                    await supabase.from("shipping_methods").update({ cod_enabled: v } as any).eq("id", m.id);
                    queryClient.invalidateQueries({ queryKey: ["admin-shipping"] });
                  }} />
                </TableCell>
                <TableCell><Switch checked={m.is_active} onCheckedChange={() => toggleActive(m.id, m.is_active)} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Edit3 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(m.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Shipping Method" : "New Shipping Method"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Standard Delivery" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Regular delivery across Bangladesh" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (৳)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Estimated Days</Label>
                <Input value={form.estimated_days} onChange={(e) => setForm({ ...form, estimated_days: e.target.value })} placeholder="3-5 business days" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Free Above (৳, optional)</Label>
                <Input type="number" value={form.min_order_free ?? ""} onChange={(e) => setForm({ ...form, min_order_free: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminShipping;
// code:4ce0
