"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/use-tab-param";
import { TabsWithParam } from "@/components/admin/TabsWithParam";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit3, MapPin, DollarSign, Building2 } from "lucide-react";

type Hub = {
  id: string;
  provider: string;
  hub_name: string;
  city: string;
  area: string | null;
  address: string;
  contact_phone: string | null;
  is_active: boolean;
  is_pickup_point: boolean;
  latitude: number | null;
  longitude: number | null;
};

type PricingRule = {
  id: string;
  provider: string;
  zone_type: string;
  weight_max: number;
  base_fee: number;
  per_kg_fee: number;
  hub_pickup_discount: number;
  is_active: boolean;
  sort_order: number;
};

const PROVIDERS = ["pathao", "steadfast"];
const ZONES = [
  { value: "inside_city", label: "Inside City" },
  { value: "sub_city", label: "Sub City" },
  { value: "outside_city", label: "Outside City" },
];

const emptyHub: Omit<Hub, "id"> = {
  provider: "pathao",
  hub_name: "",
  city: "",
  area: "",
  address: "",
  contact_phone: "",
  is_active: true,
  is_pickup_point: true,
  latitude: null,
  longitude: null,
};

const emptyRule: Omit<PricingRule, "id"> = {
  provider: "pathao",
  zone_type: "inside_city",
  weight_max: 1,
  base_fee: 70,
  per_kg_fee: 20,
  hub_pickup_discount: 30,
  is_active: true,
  sort_order: 0,
};

const AdminCourierManagement: React.FC = () => {
  const qc = useQueryClient();
  const [hubDialog, setHubDialog] = useState(false);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [hubForm, setHubForm] = useState<Omit<Hub, "id"> & { id?: string }>(emptyHub);
  const [ruleForm, setRuleForm] = useState<Omit<PricingRule, "id"> & { id?: string }>(emptyRule);

  const { data: hubs = [] } = useQuery({
    queryKey: ["admin-courier-hubs"],
    queryFn: async () => {
      const { data } = await supabase.from("courier_hubs").select("*").order("provider").order("city");
      return (data || []) as Hub[];
    },
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["admin-courier-pricing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_pricing_rules")
        .select("*")
        .order("provider")
        .order("sort_order");
      return (data || []) as PricingRule[];
    },
  });

  const saveHub = useMutation({
    mutationFn: async (h: typeof hubForm) => {
      const { id, ...payload } = h;
      if (id) {
        const { error } = await supabase.from("courier_hubs").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courier_hubs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courier-hubs"] });
      setHubDialog(false);
      toast({ title: "Hub saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteHub = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courier_hubs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courier-hubs"] });
      toast({ title: "Hub deleted" });
    },
  });

  const saveRule = useMutation({
    mutationFn: async (r: typeof ruleForm) => {
      const { id, ...payload } = r;
      if (id) {
        const { error } = await supabase.from("courier_pricing_rules").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courier_pricing_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courier-pricing"] });
      setRuleDialog(false);
      toast({ title: "Pricing rule saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courier_pricing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courier-pricing"] });
      toast({ title: "Rule deleted" });
    },
  });

  const openNewHub = () => { setHubForm(emptyHub); setHubDialog(true); };
  const openEditHub = (h: Hub) => { setHubForm(h); setHubDialog(true); };
  const openNewRule = () => { setRuleForm(emptyRule); setRuleDialog(true); };
  const openEditRule = (r: PricingRule) => { setRuleForm(r); setRuleDialog(true); };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Courier Management</h1>
        <p className="text-muted-foreground mt-1">Configure pickup hubs and dynamic shipping fees per provider.</p>
      </div>

      <TabsWithParam defaultTab="hubs" basePath="/sales/courier-management">
        <TabsList>
          <TabsTrigger value="hubs"><Building2 className="w-4 h-4 mr-2" /> Hubs</TabsTrigger>
          <TabsTrigger value="pricing"><DollarSign className="w-4 h-4 mr-2" /> Pricing Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="hubs" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{hubs.length} hub{hubs.length !== 1 ? "s" : ""} configured</p>
            <Button onClick={openNewHub} className="gap-2"><Plus className="w-4 h-4" /> Add Hub</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hubs.map((h) => (
              <Card key={h.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{h.hub_name}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs capitalize">{h.provider}</Badge>
                    </div>
                    <div className="flex gap-1">
                      {h.is_active && <Badge className="text-[10px]">Active</Badge>}
                      {h.is_pickup_point && <Badge variant="secondary" className="text-[10px]">Pickup</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{h.address}, {h.city}{h.area ? `, ${h.area}` : ""}</span>
                  </p>
                  {h.contact_phone && <p className="text-xs text-muted-foreground">📞 {h.contact_phone}</p>}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="ghost" onClick={() => openEditHub(h)}><Edit3 className="w-3 h-3 mr-1" /> Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteHub.mutate(h.id)} className="text-destructive">
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {hubs.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No hubs yet. Add your first pickup hub.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{rules.length} rule{rules.length !== 1 ? "s" : ""} configured</p>
            <Button onClick={openNewRule} className="gap-2"><Plus className="w-4 h-4" /> Add Rule</Button>
          </div>

          {PROVIDERS.map((p) => {
            const list = rules.filter((r) => r.provider === p);
            if (!list.length) return null;
            return (
              <Card key={p}>
                <CardHeader>
                  <CardTitle className="capitalize text-lg">{p}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-xs">
                          <th className="text-left py-2">Zone</th>
                          <th className="text-right">Max Weight</th>
                          <th className="text-right">Base</th>
                          <th className="text-right">Per Kg</th>
                          <th className="text-right">Hub Discount</th>
                          <th className="text-right">Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r) => (
                          <tr key={r.id} className="border-b border-border/50">
                            <td className="py-2 capitalize">{r.zone_type.replace("_", " ")}</td>
                            <td className="text-right">{r.weight_max} kg</td>
                            <td className="text-right">৳{r.base_fee}</td>
                            <td className="text-right">৳{r.per_kg_fee}</td>
                            <td className="text-right">-৳{r.hub_pickup_discount}</td>
                            <td className="text-right">
                              {r.is_active ? <Badge className="text-[10px]">On</Badge> : <Badge variant="outline" className="text-[10px]">Off</Badge>}
                            </td>
                            <td className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => openEditRule(r)}><Edit3 className="w-3 h-3" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteRule.mutate(r.id)} className="text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </TabsWithParam>

      {/* Hub Dialog */}
      <Dialog open={hubDialog} onOpenChange={setHubDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{hubForm.id ? "Edit Hub" : "New Hub"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Provider</Label>
                <Select value={hubForm.provider} onValueChange={(v) => setHubForm({ ...hubForm, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hub Name</Label>
                <Input value={hubForm.hub_name} onChange={(e) => setHubForm({ ...hubForm, hub_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input value={hubForm.city} onChange={(e) => setHubForm({ ...hubForm, city: e.target.value })} />
              </div>
              <div>
                <Label>Area</Label>
                <Input value={hubForm.area || ""} onChange={(e) => setHubForm({ ...hubForm, area: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={hubForm.address} onChange={(e) => setHubForm({ ...hubForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={hubForm.contact_phone || ""} onChange={(e) => setHubForm({ ...hubForm, contact_phone: e.target.value })} />
              </div>
              <div>
                <Label>Latitude</Label>
                <Input type="number" step="0.000001" value={hubForm.latitude ?? ""} onChange={(e) => setHubForm({ ...hubForm, latitude: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input type="number" step="0.000001" value={hubForm.longitude ?? ""} onChange={(e) => setHubForm({ ...hubForm, longitude: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2"><Switch checked={hubForm.is_active} onCheckedChange={(v) => setHubForm({ ...hubForm, is_active: v })} /> Active</label>
              <label className="flex items-center gap-2"><Switch checked={hubForm.is_pickup_point} onCheckedChange={(v) => setHubForm({ ...hubForm, is_pickup_point: v })} /> Pickup Point</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHubDialog(false)}>Cancel</Button>
            <Button onClick={() => saveHub.mutate(hubForm)} disabled={saveHub.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Dialog */}
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{ruleForm.id ? "Edit Pricing Rule" : "New Pricing Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Provider</Label>
                <Select value={ruleForm.provider} onValueChange={(v) => setRuleForm({ ...ruleForm, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zone Type</Label>
                <Select value={ruleForm.zone_type} onValueChange={(v) => setRuleForm({ ...ruleForm, zone_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZONES.map((z) => <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Weight (kg)</Label>
                <Input type="number" step="0.1" value={ruleForm.weight_max} onChange={(e) => setRuleForm({ ...ruleForm, weight_max: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={ruleForm.sort_order} onChange={(e) => setRuleForm({ ...ruleForm, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Base Fee (৳)</Label>
                <Input type="number" value={ruleForm.base_fee} onChange={(e) => setRuleForm({ ...ruleForm, base_fee: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Per Kg Fee (৳)</Label>
                <Input type="number" value={ruleForm.per_kg_fee} onChange={(e) => setRuleForm({ ...ruleForm, per_kg_fee: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Hub Discount (৳)</Label>
                <Input type="number" value={ruleForm.hub_pickup_discount} onChange={(e) => setRuleForm({ ...ruleForm, hub_pickup_discount: Number(e.target.value) })} />
              </div>
            </div>
            <label className="flex items-center gap-2"><Switch checked={ruleForm.is_active} onCheckedChange={(v) => setRuleForm({ ...ruleForm, is_active: v })} /> Active</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialog(false)}>Cancel</Button>
            <Button onClick={() => saveRule.mutate(ruleForm)} disabled={saveRule.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCourierManagement;
// code:4ce0
